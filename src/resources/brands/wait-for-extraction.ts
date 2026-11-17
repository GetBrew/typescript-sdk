import type { HttpClient } from '../../core/http'
import {
  combineCallerSignals,
  defaultSleep,
  throwReason,
} from '../../core/signals'
import { createGetBrand, type GetBrandStatusResponse } from './get'

export type WaitForExtractionOptions = {
  /** Total deadline, including HTTP attempts, retries and polling sleeps. Default 300_000. */
  readonly maxWaitMs?: number
  /** Delay between completed reads while extraction is running. Default 5_000. */
  readonly pollIntervalMs?: number
  /** Cancel the wait with this signal's original reason. */
  readonly signal?: AbortSignal
}

/** The wait ended; brand extraction may still be running on the server. */
export class BrewBrandExtractionTimeoutError extends Error {
  readonly brandId: string
  readonly maxWaitMs: number
  readonly lastStatus: GetBrandStatusResponse | undefined

  constructor(input: {
    readonly brandId: string
    readonly maxWaitMs: number
    readonly lastStatus?: GetBrandStatusResponse
  }) {
    super(
      `Brand ${input.brandId} extraction did not finish within ${String(input.maxWaitMs)}ms.`
    )
    this.name = 'BrewBrandExtractionTimeoutError'
    this.brandId = input.brandId
    this.maxWaitMs = input.maxWaitMs
    this.lastStatus = input.lastStatus
  }
}

const MAX_TIMER_MS = 2_147_483_647

function assertDuration(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0 || value > MAX_TIMER_MS) {
    throw new TypeError(
      `\`${name}\` must be a positive whole number of milliseconds <= ${String(MAX_TIMER_MS)}.`
    )
  }
}

/**
 * Read lifecycle status immediately, then every five seconds until extraction
 * ends. Returns the server's terminal row, including failed/deleting or
 * completed-but-not-ready rows; callers must inspect `ready` before generating.
 * The five-minute total deadline cancels in-flight reads, retries and sleeps.
 * Client-wide cancellation and ordinary HTTP error/retry settings are preserved.
 */
export function createWaitForExtraction(
  client: HttpClient,
  clientSignal?: AbortSignal
) {
  const getBrand = createGetBrand(client)

  return async function waitForExtraction(
    brandId: string,
    options: WaitForExtractionOptions = {}
  ): Promise<GetBrandStatusResponse> {
    const maxWaitMs = options.maxWaitMs ?? 300_000
    const pollIntervalMs = options.pollIntervalMs ?? 5_000
    assertDuration(maxWaitMs, 'maxWaitMs')
    assertDuration(pollIntervalMs, 'pollIntervalMs')

    let lastStatus: GetBrandStatusResponse | undefined
    const deadline = new AbortController()
    const combined = combineCallerSignals({
      signals: [options.signal, clientSignal, deadline.signal],
    })
    const signal = combined.signal
    const timer = setTimeout(() => {
      deadline.abort(
        new BrewBrandExtractionTimeoutError({
          brandId,
          maxWaitMs,
          ...(lastStatus === undefined ? {} : { lastStatus }),
        })
      )
    }, maxWaitMs)

    /* eslint-disable no-await-in-loop -- Each lifecycle read decides whether another poll is needed. */
    try {
      while (true) {
        if (signal?.aborted) throwReason({ reason: signal.reason })
        const status = await getBrand(
          { brandId },
          { ...(signal === undefined ? {} : { signal }) }
        )
        if (signal?.aborted) throwReason({ reason: signal.reason })
        lastStatus = status
        if (status.status !== 'extracting') return status
        await defaultSleep({ ms: pollIntervalMs, signal })
      }
    } finally {
      clearTimeout(timer)
      combined.release?.()
    }
    /* eslint-enable no-await-in-loop */
  }
}
