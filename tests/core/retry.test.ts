import { describe, expect, it } from 'vitest'

import {
  computeBackoff,
  type RetryDecisionInput,
  shouldRetry,
} from '../../src/core/retry'
import type { BrewHttpMethod } from '../../src/types'

describe('shouldRetry', () => {
  /** A retryable-by-default decision; each test overrides what it probes. */
  function decide(overrides: Partial<RetryDecisionInput>): boolean {
    return shouldRetry({
      method: 'GET',
      cause: { kind: 'status', status: 500 },
      attempt: 0,
      maxRetries: 2,
      hasIdempotencyKey: false,
      shouldRetryOnTimeout: true,
      ...overrides,
    })
  }

  describe('retry cap', () => {
    it('returns false once attempt reaches maxRetries', () => {
      expect(decide({ attempt: 2, maxRetries: 2 })).toBe(false)
    })

    it('returns false when attempt exceeds maxRetries', () => {
      expect(decide({ attempt: 5, maxRetries: 2 })).toBe(false)
    })

    it('allows retry when attempt is below maxRetries', () => {
      expect(decide({ attempt: 0, maxRetries: 2 })).toBe(true)
    })
  })

  describe('status matrix (idempotent methods)', () => {
    const retryable = [408, 429, 500, 502, 503, 504] as const
    const notRetryable = [400, 401, 403, 404, 409, 422] as const
    const idempotentMethods: ReadonlyArray<BrewHttpMethod> = [
      'GET',
      'DELETE',
      'PUT',
    ]

    for (const method of idempotentMethods) {
      it.each(retryable)(`retries %i on ${method}`, (status) => {
        expect(decide({ method, cause: { kind: 'status', status } })).toBe(true)
      })
    }

    it.each(notRetryable)('does NOT retry %i on GET', (status) => {
      expect(decide({ cause: { kind: 'status', status } })).toBe(false)
    })

    it('does NOT retry 2xx (no retries needed for success)', () => {
      expect(decide({ cause: { kind: 'status', status: 200 } })).toBe(false)
    })
  })

  describe('Retry-After ceiling', () => {
    it('retries when the server asks for a wait of up to a minute', () => {
      expect(
        decide({
          cause: { kind: 'status', status: 429, retryAfterMs: 60_000 },
        })
      ).toBe(true)
    })

    it('does NOT retry when the server asks for a longer wait', () => {
      // Sleeping minutes inside one call looks exactly like a hang; the
      // BrewApiError carries `retryAfter` so the caller can schedule it.
      expect(
        decide({
          cause: { kind: 'status', status: 429, retryAfterMs: 60_001 },
        })
      ).toBe(false)
    })
  })

  describe('method policy: POST', () => {
    it('does NOT retry POST on 500 without an idempotency key', () => {
      expect(decide({ method: 'POST', hasIdempotencyKey: false })).toBe(false)
    })

    it('retries POST on 500 when an idempotency key is attached', () => {
      expect(decide({ method: 'POST', hasIdempotencyKey: true })).toBe(true)
    })

    it('retries POST on 429 when an idempotency key is attached', () => {
      expect(
        decide({
          method: 'POST',
          hasIdempotencyKey: true,
          cause: { kind: 'status', status: 429 },
        })
      ).toBe(true)
    })

    it('does NOT retry POST 400 even with an idempotency key', () => {
      expect(
        decide({
          method: 'POST',
          hasIdempotencyKey: true,
          cause: { kind: 'status', status: 400 },
        })
      ).toBe(false)
    })
  })

  describe('method policy: PATCH', () => {
    it('never retries PATCH, even on 500', () => {
      expect(decide({ method: 'PATCH', hasIdempotencyKey: true })).toBe(false)
    })

    it('never retries PATCH on 429', () => {
      expect(
        decide({
          method: 'PATCH',
          hasIdempotencyKey: true,
          cause: { kind: 'status', status: 429 },
        })
      ).toBe(false)
    })
  })

  describe('connection failures (no HTTP answer, or the body broke)', () => {
    const connection = { kind: 'connection' } as const

    it('retries on GET', () => {
      expect(decide({ cause: connection })).toBe(true)
    })

    it('retries on POST WITH an idempotency key', () => {
      expect(
        decide({ method: 'POST', hasIdempotencyKey: true, cause: connection })
      ).toBe(true)
    })

    it('does NOT retry on POST without an idempotency key', () => {
      expect(
        decide({ method: 'POST', hasIdempotencyKey: false, cause: connection })
      ).toBe(false)
    })

    it('does NOT retry on PATCH', () => {
      expect(
        decide({ method: 'PATCH', hasIdempotencyKey: true, cause: connection })
      ).toBe(false)
    })
  })

  describe('timeouts', () => {
    const timeout = { kind: 'timeout' } as const

    it('retries by default, like any transient failure', () => {
      expect(decide({ cause: timeout })).toBe(true)
    })

    it('does NOT retry when shouldRetryOnTimeout is false', () => {
      expect(decide({ cause: timeout, shouldRetryOnTimeout: false })).toBe(
        false
      )
    })

    it('still follows the method policy', () => {
      expect(
        decide({ method: 'PATCH', hasIdempotencyKey: true, cause: timeout })
      ).toBe(false)
      expect(
        decide({ method: 'POST', hasIdempotencyKey: false, cause: timeout })
      ).toBe(false)
      expect(
        decide({ method: 'POST', hasIdempotencyKey: true, cause: timeout })
      ).toBe(true)
    })
  })

  describe('never retried', () => {
    it('does NOT retry a caller abort, however much budget is left', () => {
      expect(
        decide({ cause: { kind: 'abort' }, attempt: 0, maxRetries: 10 })
      ).toBe(false)
    })

    it('does NOT retry a 2xx body that is not JSON (the same bytes come back)', () => {
      expect(
        decide({ cause: { kind: 'parse' }, attempt: 0, maxRetries: 10 })
      ).toBe(false)
    })
  })
})

describe('computeBackoff', () => {
  it('returns retryAfterMs verbatim when present (server is authoritative)', () => {
    const delayMs = computeBackoff({
      attempt: 0,
      baseMs: 100,
      maxMs: 10_000,
      retryAfterMs: 2500,
      random: () => 0.5,
    })
    expect(delayMs).toBe(2500)
  })

  it('ignores retryAfterMs when it is undefined and computes exponential backoff', () => {
    // attempt 0, base 100, random 1 -> baseMs * 2^0 * 1.0 = 100
    const delayMs = computeBackoff({
      attempt: 0,
      baseMs: 100,
      maxMs: 10_000,
      random: () => 1,
    })
    expect(delayMs).toBe(100)
  })

  it('doubles the base for each attempt (exponential)', () => {
    // random 1 -> no jitter reduction, so we see the raw exponential curve.
    expect(
      computeBackoff({
        attempt: 0,
        baseMs: 100,
        maxMs: 10_000,
        random: () => 1,
      })
    ).toBe(100)

    expect(
      computeBackoff({
        attempt: 1,
        baseMs: 100,
        maxMs: 10_000,
        random: () => 1,
      })
    ).toBe(200)

    expect(
      computeBackoff({
        attempt: 2,
        baseMs: 100,
        maxMs: 10_000,
        random: () => 1,
      })
    ).toBe(400)

    expect(
      computeBackoff({
        attempt: 3,
        baseMs: 100,
        maxMs: 10_000,
        random: () => 1,
      })
    ).toBe(800)
  })

  it('caps the computed delay at maxMs', () => {
    expect(
      computeBackoff({
        attempt: 10,
        baseMs: 100,
        maxMs: 1000,
        random: () => 1,
      })
    ).toBe(1000)
  })

  it('applies full jitter (random in [0, computed])', () => {
    // attempt 2, base 100 -> computed 400, random 0.25 -> 100
    expect(
      computeBackoff({
        attempt: 2,
        baseMs: 100,
        maxMs: 10_000,
        random: () => 0.25,
      })
    ).toBe(100)

    // attempt 2, base 100 -> computed 400, random 0 -> 0
    expect(
      computeBackoff({
        attempt: 2,
        baseMs: 100,
        maxMs: 10_000,
        random: () => 0,
      })
    ).toBe(0)
  })

  it('jitter is bounded by the cap, not by the uncapped exponential', () => {
    // attempt 10, base 100 -> raw exponential 102_400, capped to 1000,
    // random 0.5 -> 500 (jitter applied to the cap, not the raw value).
    expect(
      computeBackoff({
        attempt: 10,
        baseMs: 100,
        maxMs: 1000,
        random: () => 0.5,
      })
    ).toBe(500)
  })
})
