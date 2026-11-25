import type {
  BrewFetch,
  BrewHttpMethod,
  BrewRawResponse,
  RequestOptions,
  ResolvedBrewClientConfig,
} from '../types'

import {
  BrewApiError,
  BrewConnectionError,
  BrewParseError,
  BrewTimeoutError,
  runtimeTimeoutCode,
} from './errors'
import { assertRetryCount, assertTimeoutMs } from './config'
import { buildHeaders, buildUploadHeaders } from './headers'
import { resolveIdempotencyKey } from './idempotency'
import { computeBackoff, type RetryCause, shouldRetry } from './retry'
import { cancelBody, readTextWithin } from './body'
import {
  credentialRedactor,
  type Redactor,
  redactThrown,
  withoutQuery,
} from './redact'
import {
  combineCallerSignals,
  createAttemptSignal,
  defaultSleep,
  throwReason,
} from './signals'
import { buildUrl, type BuildUrlInput } from './url'

export type HttpRequestInput = {
  readonly method: BrewHttpMethod
  readonly path: string
  readonly pathParams?: BuildUrlInput['pathParams']
  readonly query?: BuildUrlInput['query']
  readonly body?: unknown
  readonly options?: RequestOptions
  readonly uploadId?: string
  readonly defaultTimeoutMs?: number
  readonly idempotency?: 'none'
  readonly defaultMaxRetries?: number
}

export type HttpTuning = {
  readonly retryBaseMs?: number
  readonly retryMaxMs?: number
  readonly random?: () => number
  readonly sleep?: (input: {
    readonly ms: number
    readonly signal: AbortSignal | undefined
  }) => Promise<void>
}

export type HttpBytesInput = {
  readonly url: string
  readonly bytes: Blob
  readonly contentType: string
  readonly options?: RequestOptions
  readonly defaultTimeoutMs?: number
}

export type HttpClient = {
  request<T>(input: HttpRequestInput): Promise<BrewRawResponse<T>>
  sendBytes<T>(input: HttpBytesInput): Promise<BrewRawResponse<T>>
}

const DEFAULT_RETRY_BASE_MS = 100
const DEFAULT_RETRY_MAX_MS = 10_000

const MAX_TIMER_MS = 2_147_483_647

const IDEMPOTENCY_IN_PROGRESS = 'IDEMPOTENCY_IN_PROGRESS'

export function createHttpClient(
  config: ResolvedBrewClientConfig,
  tuning: HttpTuning = {}
): HttpClient {
  const retryBaseMs = tuning.retryBaseMs ?? DEFAULT_RETRY_BASE_MS
  const retryMaxMs = tuning.retryMaxMs ?? DEFAULT_RETRY_MAX_MS
  const random = tuning.random ?? Math.random
  const sleep = tuning.sleep ?? defaultSleep

  async function request<T>(
    input: HttpRequestInput
  ): Promise<BrewRawResponse<T>> {
    const options: RequestOptions = input.options ?? {}
    const isNeverReplayed = input.idempotency === 'none'
    const idempotencyKey = isNeverReplayed
      ? undefined
      : resolveIdempotencyKey({
          method: input.method,
          provided: options.idempotencyKey,
        })
    const hasBody = input.body !== undefined

    const url = buildUrl({
      baseUrl: config.baseUrl,
      path: input.path,
      ...(input.pathParams ? { pathParams: input.pathParams } : {}),
      ...(input.query ? { query: input.query } : {}),
    })

    const headers = buildHeaders({
      apiKey: config.apiKey,
      ...(config.brandId !== undefined ? { brandId: config.brandId } : {}),
      userAgent: config.userAgent,
      hasBody,
      ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
    })

    return send<T>({
      method: input.method,
      url,
      reportedUrl: url,
      headers,
      body: hasBody ? JSON.stringify(input.body) : null,
      options,
      defaultTimeoutMs: input.defaultTimeoutMs,
      defaultMaxRetries: input.defaultMaxRetries,
      idempotencyKey,
      uploadId: input.uploadId,
      mayRetryPost: idempotencyKey !== undefined || isNeverReplayed,
      redact: undefined,
    })
  }

  async function sendBytes<T>(
    input: HttpBytesInput
  ): Promise<BrewRawResponse<T>> {
    return send<T>({
      method: 'POST',
      url: input.url,
      reportedUrl: withoutQuery({ url: input.url }),
      headers: buildUploadHeaders({
        userAgent: config.userAgent,
        contentType: input.contentType,
      }),
      body: input.bytes,
      options: input.options ?? {},
      defaultTimeoutMs: input.defaultTimeoutMs,
      defaultMaxRetries: undefined,
      idempotencyKey: undefined,
      uploadId: undefined,
      mayRetryPost: true,
      redact: credentialRedactor({ url: input.url }),
    })
  }

  async function send<T>(exchange: Exchange): Promise<BrewRawResponse<T>> {
    const { options, idempotencyKey } = exchange
    if (options.maxRetries !== undefined) {
      assertRetryCount({ value: options.maxRetries, name: 'maxRetries' })
    }
    if (options.timeoutMs !== undefined) {
      assertTimeoutMs({ value: options.timeoutMs, name: 'timeoutMs' })
    }
    const maxRetries =
      options.maxRetries ?? exchange.defaultMaxRetries ?? config.maxRetries
    const timeoutMs = normalizeTimeoutMs({
      timeoutMs:
        options.timeoutMs ??
        Math.max(config.timeoutMs, exchange.defaultTimeoutMs ?? 0),
    })
    const shouldRetryOnTimeout = options.retryOnTimeout ?? config.retryOnTimeout

    const caller = combineCallerSignals({
      signals: [options.signal, config.signal],
    })
    const callerSignal = caller.signal

    /* eslint-disable no-await-in-loop --
     * Sequential awaits inside the retry loop are intentional and the
     * entire reason the loop exists. Each iteration must:
     *   1. Wait for the attempt — headers AND body — to settle before
     *      deciding whether to retry.
     *   2. Release the discarded attempt's body before the next hop.
     *   3. Finish the backoff before starting again.
     * Parallelizing any of these would break correctness, so the
     * `no-await-in-loop` rule is disabled for the duration of this loop
     * with a real explanation rather than scattered line-disables.
     */
    try {
      let attempt = 0
      let unknownOutcome: UnknownOutcome | undefined

      while (attempt <= maxRetries) {
        const attemptSignal = createAttemptSignal({ timeoutMs, callerSignal })
        try {
          const result = await runAttempt<T>({
            fetchImpl: config.fetch,
            url: exchange.url,
            method: exchange.method,
            headers: exchange.headers,
            body: exchange.body,
            signal: attemptSignal.signal,
          })

          if (result.kind === 'success') return result.value

          const cause = classifyFailure({
            result,
            callerSignal,
            timeoutSignal: attemptSignal.timeoutSignal,
          })

          if (cause.kind === 'abort') {
            await cancelBody({
              response: responseOf({ result }),
              reason: callerSignal?.reason,
            })
            throwReason({ reason: callerSignal?.reason })
          }

          const isRetryable = shouldRetry({
            method: exchange.method,
            cause,
            attempt,
            maxRetries,
            hasIdempotencyKey: exchange.mayRetryPost,
            shouldRetryOnTimeout,
          })

          if (!isRetryable) {
            throw await toTerminalError({
              result,
              cause,
              attemptSignal: attemptSignal.signal,
              callerSignal,
              unknownOutcome,
              request: {
                method: exchange.method,
                url: exchange.reportedUrl,
                timeoutMs,
                attempts: attempt + 1,
                idempotencyKey,
                uploadId: exchange.uploadId,
                redact: exchange.redact,
              },
            })
          }

          if (cause.kind === 'timeout' || cause.kind === 'connection') {
            unknownOutcome = {
              kind: cause.kind,
              error:
                result.kind === 'transport-failure' ? result.error : undefined,
            }
          }

          attemptSignal.discard()
          await cancelBody({ response: responseOf({ result }) })

          await sleep({
            ms: computeBackoff({
              attempt,
              baseMs: retryBaseMs,
              maxMs: retryMaxMs,
              ...(cause.kind === 'status' && cause.retryAfterMs !== undefined
                ? { retryAfterMs: cause.retryAfterMs }
                : {}),
              random,
            }),
            signal: callerSignal,
          })
          if (callerSignal?.aborted === true) {
            throwReason({ reason: callerSignal.reason })
          }
        } finally {
          attemptSignal.release?.()
        }
        attempt++
      }
    } finally {
      caller.release?.()
    }
    /* eslint-enable no-await-in-loop */

    throw new Error('http: retry loop exited without a result')
  }

  return { request, sendBytes }
}

type Exchange = {
  readonly method: BrewHttpMethod
  readonly url: string
  readonly reportedUrl: string
  readonly headers: Headers
  readonly body: string | Blob | null
  readonly options: RequestOptions
  readonly defaultTimeoutMs: number | undefined
  readonly defaultMaxRetries: number | undefined
  readonly idempotencyKey: string | undefined
  readonly uploadId: string | undefined
  readonly mayRetryPost: boolean
  readonly redact: Redactor | undefined
}

type AttemptResult<T> =
  | { readonly kind: 'success'; readonly value: BrewRawResponse<T> }
  | {
      readonly kind: 'transport-failure'
      readonly error: unknown
      readonly response: Response | undefined
    }
  | {
      readonly kind: 'parse-failure'
      readonly response: Response
      readonly error: unknown
      readonly text: string
    }
  | { readonly kind: 'error-response'; readonly response: Response }

type AttemptFailure<T> = Exclude<AttemptResult<T>, { kind: 'success' }>

type UnknownOutcome = {
  readonly kind: 'timeout' | 'connection'
  readonly error: unknown
}

function responseOf<T>({
  result,
}: {
  readonly result: AttemptFailure<T>
}): Response | undefined {
  return result.response
}

async function runAttempt<T>({
  fetchImpl,
  url,
  method,
  headers,
  body,
  signal,
}: {
  readonly fetchImpl: BrewFetch
  readonly url: string
  readonly method: BrewHttpMethod
  readonly headers: Headers
  readonly body: string | Blob | null
  readonly signal: AbortSignal
}): Promise<AttemptResult<T>> {
  let response: Response
  try {
    response = await fetchImpl(url, { method, headers, body, signal })
  } catch (error) {
    return { kind: 'transport-failure', error, response: undefined }
  }

  if (!response.ok) {
    return { kind: 'error-response', response }
  }

  let text: string
  try {
    text = await readTextWithin({ response, signal })
  } catch (error) {
    return { kind: 'transport-failure', error, response }
  }

  if (text === '') {
    return {
      kind: 'success',
      value: toRawResponse({ response, data: undefined as T }),
    }
  }

  let data: T
  try {
    data = JSON.parse(text) as T
  } catch (error) {
    return { kind: 'parse-failure', response, error, text }
  }
  return { kind: 'success', value: toRawResponse({ response, data }) }
}

function toRawResponse<T>({
  response,
  data,
}: {
  readonly response: Response
  readonly data: T
}): BrewRawResponse<T> {
  return {
    data,
    status: response.status,
    headers: response.headers,
    requestId: response.headers.get('x-request-id') ?? undefined,
  }
}

function classifyFailure<T>({
  result,
  callerSignal,
  timeoutSignal,
}: {
  readonly result: AttemptFailure<T>
  readonly callerSignal: AbortSignal | undefined
  readonly timeoutSignal: AbortSignal
}): RetryCause {
  if (result.kind === 'error-response') {
    const retryAfterMs = readRetryAfterMs({ headers: result.response.headers })
    return {
      kind: 'status',
      status: result.response.status,
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
    }
  }
  if (result.kind === 'parse-failure') return { kind: 'parse' }
  if (callerSignal?.aborted === true) return { kind: 'abort' }
  if (timeoutSignal.aborted) return { kind: 'timeout' }
  if (runtimeTimeoutCode({ error: result.error }) !== undefined) {
    return { kind: 'timeout' }
  }
  return { kind: 'connection' }
}

type TerminalRequest = {
  readonly method: BrewHttpMethod
  readonly url: string
  readonly timeoutMs: number
  readonly attempts: number
  readonly idempotencyKey: string | undefined
  readonly uploadId: string | undefined
  readonly redact: Redactor | undefined
}

async function toTerminalError<T>({
  result,
  cause,
  attemptSignal,
  callerSignal,
  unknownOutcome,
  request,
}: {
  readonly result: AttemptFailure<T>
  readonly cause: RetryCause
  readonly attemptSignal: AbortSignal
  readonly callerSignal: AbortSignal | undefined
  readonly unknownOutcome: UnknownOutcome | undefined
  readonly request: TerminalRequest
}): Promise<Error> {
  switch (result.kind) {
    case 'error-response': {
      const { body, bodyError } = await readErrorBody({
        response: result.response,
        signal: attemptSignal,
      })
      if (callerSignal?.aborted === true) {
        throwReason({ reason: callerSignal.reason })
      }
      const apiError = BrewApiError.fromResponse({
        status: result.response.status,
        headers: result.response.headers,
        body,
        bodyError,
        idempotencyKey: request.idempotencyKey,
        uploadId: request.uploadId,
      })
      if (
        apiError.code === IDEMPOTENCY_IN_PROGRESS &&
        unknownOutcome !== undefined
      ) {
        return transportError({
          kind: unknownOutcome.kind,
          error: unknownOutcome.error,
          request,
          isInProgress: true,
        })
      }
      return apiError
    }
    case 'parse-failure':
      return new BrewParseError({
        status: result.response.status,
        requestId: result.response.headers.get('x-request-id') ?? undefined,
        idempotencyKey: request.idempotencyKey,
        uploadId: request.uploadId,
        bodyPreview: result.text.slice(0, 256),
        cause: result.error,
      })
    case 'transport-failure':
      return transportError({
        kind: cause.kind === 'timeout' ? 'timeout' : 'connection',
        error: result.error,
        request,
        isInProgress: false,
      })
  }
}

function transportError({
  kind,
  error,
  request,
  isInProgress,
}: {
  readonly kind: 'timeout' | 'connection'
  readonly error: unknown
  readonly request: TerminalRequest
  readonly isInProgress: boolean
}): Error {
  const cause =
    request.redact === undefined
      ? error
      : redactThrown({ value: error, redact: request.redact })
  const shared = {
    method: request.method,
    url: request.url,
    attempts: request.attempts,
    idempotencyKey: request.idempotencyKey,
    uploadId: request.uploadId,
    inProgress: isInProgress,
    cause,
  }
  if (kind === 'timeout') {
    return new BrewTimeoutError({ ...shared, timeoutMs: request.timeoutMs })
  }
  return new BrewConnectionError(shared)
}

async function readErrorBody({
  response,
  signal,
}: {
  readonly response: Response
  readonly signal: AbortSignal
}): Promise<{ readonly body: unknown; readonly bodyError: Error | undefined }> {
  let text: string
  try {
    text = await readTextWithin({ response, signal })
  } catch (error) {
    return { body: null, bodyError: normalizeToError(error) }
  }
  if (text === '') return { body: null, bodyError: undefined }
  try {
    return { body: JSON.parse(text) as unknown, bodyError: undefined }
  } catch {
    return { body: null, bodyError: undefined }
  }
}

function normalizeTimeoutMs({
  timeoutMs,
}: {
  readonly timeoutMs: number
}): number {
  if (timeoutMs === Number.POSITIVE_INFINITY) return MAX_TIMER_MS
  return Math.min(Math.floor(timeoutMs), MAX_TIMER_MS)
}

function readRetryAfterMs({
  headers,
}: {
  readonly headers: Headers
}): number | undefined {
  const raw = headers.get('retry-after')
  if (raw === null) return undefined
  const seconds = Number(raw)
  if (!Number.isFinite(seconds)) return undefined
  return seconds * 1000
}

function normalizeToError(value: unknown): Error {
  if (value instanceof Error) return value
  return new Error(typeof value === 'string' ? value : 'Unknown error')
}

export function unwrapResponse<T>(
  response: BrewRawResponse<T>,
  options: RequestOptions | undefined
): T | BrewRawResponse<T> {
  return options?.raw === true ? response : response.data
}
