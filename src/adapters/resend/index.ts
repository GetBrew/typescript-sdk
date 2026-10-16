/**
 * `@brew.new/sdk/resend`: a Resend-shaped client for template sends, so a
 * Resend call site moves to Brew by changing its import.
 *
 * ```ts
 * import { Resend } from '@brew.new/sdk/resend'
 *
 * const resend = new Resend(process.env.BREW_API_KEY, {
 *   templates: { 'tmpl_password_reset': 'auth.password-reset' },
 * })
 * const { data, error } = await resend.emails.send({
 *   to: user.email,
 *   template: { id: 'tmpl_password_reset', variables: { confirmationUrl } },
 * })
 * ```
 *
 * Each send is `brew.send(templates[id] ?? id, { ...variables, email: to })`,
 * reading only `templates`' own entries.
 * Methods never throw: they answer `{ data, error }` like Resend.
 */
import {
  type BrewClient,
  createBrewClient,
  type SendPayloadValue,
} from '@brew.new/sdk'

import { IDEMPOTENCY_KEY_MAX_LENGTH, sha256Hex } from '../shared/idempotency'

import { type ResendCompatError, resendError, toResendError } from './errors'

export type { ResendCompatError, ResendCompatErrorName } from './errors'

export type ResendCompatOptions = {
  /** Brew API base URL. Default `https://brew.new/api`. */
  readonly baseUrl?: string
  /** The brand to send from, for an organization-scoped API key. */
  readonly brandId?: string
  /**
   * Resend template id → Brew trigger key, for templates whose id is not
   * already the key: `{ 'tmpl_123': 'auth.password-reset' }`.
   */
  readonly templates?: Readonly<Record<string, string>>
  /**
   * Told once per field when a send carries a field Brew ignores (`from`,
   * `subject`, `replyTo`, `tags`, …: they live on the automation's send
   * step). Default `console.warn`.
   */
  readonly onWarning?: (message: string) => void
  /** Send through this client instead of building one from the API key. */
  readonly client?: BrewClient
}

/** Template data: any JSON value (Resend allows strings and numbers). */
export type ResendTemplateVariables = Readonly<Record<string, SendPayloadValue>>

/**
 * Resend's `emails.send` options. A send needs `to` (one recipient) and
 * `template`; the other fields compile so a migrated call site keeps
 * building, and are ignored or refused at run time as documented on each.
 */
export type ResendCompatSendInput = {
  /** One recipient: `'jane@example.com'`, `'Jane <jane@example.com>'`, or a one-element array. */
  readonly to: string | ReadonlyArray<string>
  /** `id` is the Brew trigger key, or a Resend id mapped by `templates`. */
  readonly template?: {
    readonly id: string
    readonly variables?: ResendTemplateVariables
  }
  /** Ignored: the sender is set on the automation's send step. */
  readonly from?: string
  /** Ignored: the subject is set on the automation's send step. */
  readonly subject?: string
  /** Ignored: the reply-to address is set on the automation's send step. */
  readonly replyTo?: string | ReadonlyArray<string>
  /** Ignored. */
  readonly tags?: ReadonlyArray<{
    readonly name: string
    readonly value: string
  }>
  /** Ignored. */
  readonly topicId?: string | null
  /** @deprecated Refused without `template` (`brew_template_required`): import the design into Brew and send it by key. */
  readonly html?: string
  /** @deprecated Refused without `template` (`brew_template_required`): import the design into Brew and send it by key. */
  readonly text?: string
  /** @deprecated Refused without `template` (`brew_template_required`): import the design into Brew and send it by key. */
  readonly react?: unknown
  /** @deprecated Refused (`brew_unsupported_field`): one recipient per send. */
  readonly cc?: string | ReadonlyArray<string>
  /** @deprecated Refused (`brew_unsupported_field`): one recipient per send. */
  readonly bcc?: string | ReadonlyArray<string>
  /** @deprecated Refused (`brew_unsupported_field`). */
  readonly attachments?: ReadonlyArray<unknown>
  /** @deprecated Refused (`brew_unsupported_field`). */
  readonly headers?: Readonly<Record<string, string>>
  /** @deprecated Refused (`brew_unsupported_field`): add a wait step to the automation instead. */
  readonly scheduledAt?: string
}

export type ResendCompatRequestOptions = {
  /** Sent as Brew's `Idempotency-Key`: a repeat replays instead of sending twice. */
  readonly idempotencyKey?: string
}

/** Resend's response union. `headers` is always `null` here. */
export type ResendCompatResponse<TData> =
  | { readonly data: TData; readonly error: null; readonly headers: null }
  | {
      readonly data: null
      readonly error: ResendCompatError
      readonly headers: null
    }

/** `id` is the Brew trigger instance id (`automations.triggerInstances.get(id)`). */
export type ResendCompatSendResult = { readonly id: string }

export type ResendCompatBatchResult = {
  readonly data: ReadonlyArray<ResendCompatSendResult>
}

/** Where an `html` / `react` / `text` send is pointed: the migration guide. */
export const RESEND_MIGRATION_DOCS_URL =
  'https://docs.brew.new/migrations/resend'

/** The Brew CLI command that imports Resend templates and rewrites call sites. */
export const RESEND_MIGRATION_COMMAND = 'npx @brew.new/cli migrate resend'

const TEMPLATE_REQUIRED_MESSAGE = `Brew sends app email from templates. Import this design into Brew and send it by key: run \`${RESEND_MIGRATION_COMMAND}\`, or see ${RESEND_MIGRATION_DOCS_URL}`

const UNSUPPORTED_FIELD_NAMES = [
  'cc',
  'bcc',
  'attachments',
  'headers',
  'scheduledAt',
] as const

const UNSUPPORTED_FIELDS: Readonly<
  Record<(typeof UNSUPPORTED_FIELD_NAMES)[number], string>
> = {
  cc: '`cc` is not supported: Brew sends one recipient per send; use batch.send with one entry per recipient.',
  bcc: '`bcc` is not supported: Brew sends one recipient per send; use batch.send with one entry per recipient.',
  attachments:
    '`attachments` is not supported: link to the file from the template instead.',
  headers: '`headers` is not supported on Brew app email.',
  scheduledAt:
    '`scheduledAt` is not supported: add a wait step to the automation, or send later.',
}

const IGNORED_FIELDS = [
  'from',
  'subject',
  'replyTo',
  'tags',
  'topicId',
] as const

const BODY_FIELDS = ['html', 'text', 'react'] as const

/** At most this many emails per `batch.send`, like Resend. */
export const RESEND_COMPAT_BATCH_LIMIT = 100

type Prepared =
  | {
      readonly ok: true
      readonly key: string
      readonly payload: { email: string } & Record<string, SendPayloadValue>
      readonly ignored: ReadonlyArray<string>
    }
  | { readonly ok: false; readonly error: ResendCompatError }

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return false
  }
  return !(Array.isArray(value) && value.length === 0)
}

function fail(error: ResendCompatError): Prepared {
  return { ok: false, error }
}

/** `'Jane <jane@example.com>'` → `'jane@example.com'`; a bare address as is. */
function recipientAddress(to: string): string {
  const match = /<([^<>]+)>\s*$/.exec(to)
  return (match?.[1] ?? to).trim()
}

function readRecipient(to: unknown): string | ResendCompatError {
  const list: ReadonlyArray<unknown> = Array.isArray(to) ? to : [to]
  if (list.length > 1) {
    return resendError(
      'brew_unsupported_field',
      'Brew sends one recipient per send: pass one `to`, or use batch.send with one entry per recipient.'
    )
  }
  const [first] = list
  const address = typeof first === 'string' ? recipientAddress(first) : ''
  if (address === '') {
    return resendError(
      'validation_error',
      '`to` is required: one recipient email address.'
    )
  }
  return address
}

function prepare(
  input: ResendCompatSendInput,
  templates: Readonly<Record<string, string>>
): Prepared {
  if (typeof input !== 'object' || input === null) {
    return fail(resendError('validation_error', 'The email must be an object.'))
  }
  for (const field of UNSUPPORTED_FIELD_NAMES) {
    if (isPresent(input[field])) {
      return fail(
        resendError('brew_unsupported_field', UNSUPPORTED_FIELDS[field])
      )
    }
  }
  const recipient = readRecipient(input.to)
  if (typeof recipient !== 'string') {
    return fail(recipient)
  }
  const bodyFields = BODY_FIELDS.filter((field) => isPresent(input[field]))
  const { template } = input
  if (template === undefined || template === null) {
    return fail(
      resendError(
        'brew_template_required',
        bodyFields.length > 0
          ? TEMPLATE_REQUIRED_MESSAGE
          : `\`template\` is required: { id, variables }. ${TEMPLATE_REQUIRED_MESSAGE}`
      )
    )
  }
  if (typeof template.id !== 'string' || template.id.trim() === '') {
    return fail(
      resendError(
        'validation_error',
        '`template.id` is required: the Brew trigger key, or a Resend id mapped in `templates`.'
      )
    )
  }
  const ignored = [
    ...IGNORED_FIELDS.filter((field) => isPresent(input[field])),
    ...bodyFields,
  ]
  return {
    ok: true,
    key: templateKey(templates, template.id),
    // The recipient wins over a `variables.email`.
    payload: { ...template.variables, email: recipient },
    ignored,
  }
}

/**
 * The trigger key for a template id: its `templates` entry, else the id.
 * Own entries only, so an id like `constructor` or `__proto__` is not read
 * off `Object.prototype`.
 */
function templateKey(
  templates: Readonly<Record<string, string>>,
  id: string
): string {
  return Object.hasOwn(templates, id) ? (templates[id] ?? id) : id
}

/**
 * What batch email `i` is keyed by: `${base}:${i}`. The base is the
 * caller's key when that fits the API's limit with room for the largest
 * index (`:99`), so up to 97 characters. A longer key keeps its first 32
 * characters and ends in its full SHA-256, so every email's key fits, a
 * retry derives the same keys, and two keys that share a prefix stay apart.
 */
async function batchIdempotencyKeyBase(key: string): Promise<string> {
  const room =
    IDEMPOTENCY_KEY_MAX_LENGTH - `:${RESEND_COMPAT_BATCH_LIMIT - 1}`.length
  if (key.length <= room) {
    return key
  }
  const digest = await sha256Hex(key)
  return `${key.slice(0, room - digest.length - 1)}:${digest}`
}

function readEnvironmentApiKey(): string | undefined {
  if (typeof process === 'undefined') {
    return undefined
  }
  return process.env['BREW_API_KEY']
}

function failure(error: ResendCompatError): {
  readonly data: null
  readonly error: ResendCompatError
  readonly headers: null
} {
  return { data: null, error, headers: null }
}

/**
 * A Resend-shaped Brew client. `apiKey` defaults to `BREW_API_KEY`; without
 * one, every send answers `missing_api_key` (it never throws, here or on a
 * send).
 */
export class Resend {
  readonly emails: {
    readonly send: (
      input: ResendCompatSendInput,
      options?: ResendCompatRequestOptions
    ) => Promise<ResendCompatResponse<ResendCompatSendResult>>
  }

  readonly batch: {
    /**
     * Send up to 100 emails, one at a time, in order. NOT atomic: when one
     * fails, the ones before it were sent and the rest are not; the error
     * says how far it got. Every email is checked before the first is sent.
     * With `idempotencyKey`, email `i` sends with `${idempotencyKey}:${i}`
     * (a key over 97 characters is first shortened to its first 32
     * characters and its SHA-256, to fit the API's 100-character limit),
     * so retrying the same batch replays the sent ones and sends the rest.
     */
    readonly send: (
      inputs: ReadonlyArray<ResendCompatSendInput>,
      options?: ResendCompatRequestOptions
    ) => Promise<ResendCompatResponse<ResendCompatBatchResult>>
  }

  constructor(apiKey?: string, options: ResendCompatOptions = {}) {
    const templates = options.templates ?? {}
    const onWarning =
      options.onWarning ?? ((message: string) => console.warn(message))
    const warned = new Set<string>()
    let client: BrewClient | undefined = options.client

    const getClient = (): BrewClient | ResendCompatError => {
      if (client) {
        return client
      }
      const key = apiKey ?? readEnvironmentApiKey()
      if (key === undefined || key.trim() === '') {
        return resendError(
          'missing_api_key',
          'Missing API key: pass it to `new Resend(apiKey)` or set BREW_API_KEY.',
          401
        )
      }
      try {
        client = createBrewClient({
          apiKey: key,
          ...(options.baseUrl === undefined
            ? {}
            : { baseUrl: options.baseUrl }),
          ...(options.brandId === undefined
            ? {}
            : { brandId: options.brandId }),
        })
        return client
      } catch (error) {
        return toResendError(error)
      }
    }

    const warnIgnored = (fields: ReadonlyArray<string>): void => {
      const fresh = fields.filter((field) => !warned.has(field))
      if (fresh.length === 0) {
        return
      }
      for (const field of fresh) {
        warned.add(field)
      }
      const list = fresh.map((field) => `\`${field}\``).join(', ')
      onWarning(
        `[@brew.new/sdk/resend] ${list} ignored: Brew sends the template's design, subject and sender as set on its automation.`
      )
    }

    const send = async (
      input: ResendCompatSendInput,
      requestOptions: ResendCompatRequestOptions = {}
    ): Promise<ResendCompatResponse<ResendCompatSendResult>> => {
      try {
        const prepared = prepare(input, templates)
        if (!prepared.ok) {
          return failure(prepared.error)
        }
        const brew = getClient()
        if (!isClient(brew)) {
          return failure(brew)
        }
        warnIgnored(prepared.ignored)
        const result = await brew.send(
          prepared.key,
          prepared.payload,
          idempotencyOption(requestOptions.idempotencyKey)
        )
        return {
          data: { id: result.triggerInstanceId },
          error: null,
          headers: null,
        }
      } catch (error) {
        return failure(toResendError(error))
      }
    }

    const sendBatch = async (
      inputs: ReadonlyArray<ResendCompatSendInput>,
      requestOptions: ResendCompatRequestOptions = {}
    ): Promise<ResendCompatResponse<ResendCompatBatchResult>> => {
      try {
        // `Array.isArray` narrows to `any[]`; iterate the typed reference.
        const list: ReadonlyArray<ResendCompatSendInput> = inputs
        if (!Array.isArray(inputs) || list.length === 0) {
          return failure(
            resendError(
              'validation_error',
              'batch.send takes a non-empty array of emails.'
            )
          )
        }
        if (list.length > RESEND_COMPAT_BATCH_LIMIT) {
          return failure(
            resendError(
              'validation_error',
              `batch.send takes at most ${RESEND_COMPAT_BATCH_LIMIT} emails; got ${list.length}.`
            )
          )
        }
        const prepared: Array<Extract<Prepared, { ok: true }>> = []
        for (const [index, input] of list.entries()) {
          const one = prepare(input, templates)
          if (!one.ok) {
            return failure({
              ...one.error,
              message: `emails[${index}]: ${one.error.message} Nothing was sent.`,
            })
          }
          prepared.push(one)
        }
        const brew = getClient()
        if (!isClient(brew)) {
          return failure(brew)
        }
        warnIgnored(prepared.flatMap((one) => one.ignored))
        const keyBase =
          requestOptions.idempotencyKey === undefined
            ? undefined
            : await batchIdempotencyKeyBase(requestOptions.idempotencyKey)
        const ids: Array<ResendCompatSendResult> = []
        for (const [index, one] of prepared.entries()) {
          const idempotencyKey =
            keyBase === undefined ? undefined : `${keyBase}:${index}`
          try {
            // Sequential on purpose: the batch reports how far it got, and a
            // retry with the same idempotencyKey resumes in the same order.
            // eslint-disable-next-line no-await-in-loop
            const result = await brew.send(
              one.key,
              one.payload,
              idempotencyOption(idempotencyKey)
            )
            ids.push({ id: result.triggerInstanceId })
          } catch (error) {
            const mapped = toResendError(error)
            return failure({
              ...mapped,
              message: `emails[${index}]: ${mapped.message} The batch stopped there: ${index} of ${prepared.length} were sent.${
                requestOptions.idempotencyKey === undefined
                  ? ''
                  : ' Retry with the same idempotencyKey to send the rest without repeating them.'
              }`,
            })
          }
        }
        return { data: { data: ids }, error: null, headers: null }
      } catch (error) {
        return failure(toResendError(error))
      }
    }

    this.emails = { send }
    this.batch = { send: sendBatch }
  }
}

function isClient(value: BrewClient | ResendCompatError): value is BrewClient {
  return 'send' in value && typeof value.send === 'function'
}

function idempotencyOption(
  idempotencyKey: string | undefined
): { idempotencyKey: string } | undefined {
  return idempotencyKey === undefined ? undefined : { idempotencyKey }
}
