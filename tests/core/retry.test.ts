import { describe, expect, it } from 'vitest'

import { computeBackoff, shouldRetry } from '../../src/core/retry'
import type { BrewHttpMethod } from '../../src/types'

describe('shouldRetry', () => {
  describe('retry cap', () => {
    it('returns false once attempt reaches maxRetries', () => {
      expect(
        shouldRetry({
          method: 'GET',
          status: 500,
          attempt: 2,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(false)
    })

    it('returns false when attempt exceeds maxRetries', () => {
      expect(
        shouldRetry({
          method: 'GET',
          status: 500,
          attempt: 5,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(false)
    })

    it('allows retry when attempt is below maxRetries', () => {
      expect(
        shouldRetry({
          method: 'GET',
          status: 500,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(true)
    })
  })

  describe('status matrix (idempotent methods)', () => {
    const retryable = [408, 429, 500, 502, 503, 504] as const
    const notRetryable = [400, 401, 403, 404, 409, 422] as const

    it.each(retryable)('retries %i on GET', (status) => {
      expect(
        shouldRetry({
          method: 'GET',
          status,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(true)
    })

    it.each(notRetryable)('does NOT retry %i on GET', (status) => {
      expect(
        shouldRetry({
          method: 'GET',
          status,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(false)
    })

    it.each(retryable)('retries %i on DELETE', (status) => {
      expect(
        shouldRetry({
          method: 'DELETE',
          status,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(true)
    })

    it.each(retryable)('retries %i on PUT', (status) => {
      expect(
        shouldRetry({
          method: 'PUT',
          status,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(true)
    })

    it('does NOT retry 2xx (no retries needed for success)', () => {
      expect(
        shouldRetry({
          method: 'GET',
          status: 200,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(false)
    })
  })

  describe('method policy: POST', () => {
    it('does NOT retry POST on 500 without an idempotency key', () => {
      expect(
        shouldRetry({
          method: 'POST',
          status: 500,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(false)
    })

    it('retries POST on 500 when an idempotency key is attached', () => {
      expect(
        shouldRetry({
          method: 'POST',
          status: 500,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: true,
        })
      ).toBe(true)
    })

    it('retries POST on 429 when an idempotency key is attached', () => {
      expect(
        shouldRetry({
          method: 'POST',
          status: 429,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: true,
        })
      ).toBe(true)
    })

    it('does NOT retry POST 400 even with an idempotency key', () => {
      expect(
        shouldRetry({
          method: 'POST',
          status: 400,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: true,
        })
      ).toBe(false)
    })
  })

  describe('method policy: PATCH', () => {
    it('never retries PATCH, even on 500', () => {
      expect(
        shouldRetry({
          method: 'PATCH',
          status: 500,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: true,
        })
      ).toBe(false)
    })

    it('never retries PATCH on 429', () => {
      expect(
        shouldRetry({
          method: 'PATCH',
          status: 429,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: true,
        })
      ).toBe(false)
    })
  })

  describe('network failures (no status, error present)', () => {
    const networkError = new TypeError('fetch failed')

    it('retries a network error on GET', () => {
      expect(
        shouldRetry({
          method: 'GET',
          error: networkError,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(true)
    })

    it('retries a network error on POST WITH an idempotency key', () => {
      expect(
        shouldRetry({
          method: 'POST',
          error: networkError,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: true,
        })
      ).toBe(true)
    })

    it('does NOT retry a network error on POST without an idempotency key', () => {
      expect(
        shouldRetry({
          method: 'POST',
          error: networkError,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: false,
        })
      ).toBe(false)
    })

    it('does NOT retry a network error on PATCH', () => {
      expect(
        shouldRetry({
          method: 'PATCH',
          error: networkError,
          attempt: 0,
          maxRetries: 2,
          hasIdempotencyKey: true,
        })
      ).toBe(false)
    })
  })

  it('returns false when neither status nor error is provided (nothing to retry on)', () => {
    expect(
      shouldRetry({
        method: 'GET' satisfies BrewHttpMethod,
        attempt: 0,
        maxRetries: 2,
        hasIdempotencyKey: false,
      })
    ).toBe(false)
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
