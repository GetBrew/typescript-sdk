import { describe, expect, it } from 'vitest'

import {
  generateIdempotencyKey,
  resolveIdempotencyKey,
} from '../../src/core/idempotency'

// Canonical RFC 4122 v4 UUID shape:
//   8-4-4-4-12 hex chars, with the version nibble forced to `4`
//   and the variant nibble in [8, 9, a, b].
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('generateIdempotencyKey', () => {
  it('returns a string that matches the RFC 4122 v4 UUID shape', () => {
    const key = generateIdempotencyKey()
    expect(key).toMatch(UUID_V4_REGEX)
  })

  it('returns a different value on each call', () => {
    const a = generateIdempotencyKey()
    const b = generateIdempotencyKey()
    expect(a).not.toBe(b)
  })
})

describe('resolveIdempotencyKey', () => {
  describe('POST', () => {
    it('auto-generates a UUID when no key is provided', () => {
      const key = resolveIdempotencyKey({
        method: 'POST',
        provided: undefined,
      })
      expect(key).toMatch(UUID_V4_REGEX)
    })

    it('uses the provided key verbatim when the caller passes one', () => {
      const key = resolveIdempotencyKey({
        method: 'POST',
        provided: 'idem_caller_supplied_abc',
      })
      expect(key).toBe('idem_caller_supplied_abc')
    })

    it('generates a unique key on each POST call without a provided one', () => {
      const a = resolveIdempotencyKey({ method: 'POST', provided: undefined })
      const b = resolveIdempotencyKey({ method: 'POST', provided: undefined })
      expect(a).not.toBe(b)
    })
  })

  describe('non-POST methods (never carry an idempotency key)', () => {
    it('returns undefined for GET', () => {
      expect(
        resolveIdempotencyKey({ method: 'GET', provided: undefined })
      ).toBeUndefined()
    })

    it('returns undefined for DELETE', () => {
      expect(
        resolveIdempotencyKey({ method: 'DELETE', provided: undefined })
      ).toBeUndefined()
    })

    it('returns undefined for PUT', () => {
      expect(
        resolveIdempotencyKey({ method: 'PUT', provided: undefined })
      ).toBeUndefined()
    })

    it('returns undefined for PATCH', () => {
      expect(
        resolveIdempotencyKey({ method: 'PATCH', provided: undefined })
      ).toBeUndefined()
    })

    it('ignores a provided key on GET (non-POST should not set Idempotency-Key)', () => {
      expect(
        resolveIdempotencyKey({
          method: 'GET',
          provided: 'idem_should_be_ignored',
        })
      ).toBeUndefined()
    })

    it('ignores a provided key on PATCH', () => {
      expect(
        resolveIdempotencyKey({
          method: 'PATCH',
          provided: 'idem_should_be_ignored',
        })
      ).toBeUndefined()
    })
  })
})
