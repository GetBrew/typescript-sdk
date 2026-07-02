import { describe, expect, it } from 'vitest'

import { BrewApiError } from '../../src/core/errors'

describe('BrewApiError', () => {
  describe('constructor', () => {
    it('extends Error so `instanceof Error` stays true', () => {
      const error = new BrewApiError({
        message: 'boom',
        status: 500,
        code: 'INTERNAL_ERROR',
        type: 'internal_error',
        param: undefined,
        suggestion: 'Retry the request.',
        docs: 'https://docs.getbrew.io/api',
        requestId: undefined,
        retryAfter: undefined,
      })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(BrewApiError)
      expect(error.name).toBe('BrewApiError')
      expect(error.message).toBe('boom')
    })

    it('exposes every public field as a readonly property', () => {
      const error = new BrewApiError({
        message: 'Contact not found',
        status: 404,
        code: 'CONTACT_NOT_FOUND',
        type: 'not_found',
        param: 'email',
        suggestion: 'Use POST /api/v1/contacts to create a new contact first.',
        docs: 'https://docs.getbrew.io/api/contacts#errors',
        requestId: 'req_abc',
        retryAfter: undefined,
      })

      expect(error.status).toBe(404)
      expect(error.code).toBe('CONTACT_NOT_FOUND')
      expect(error.type).toBe('not_found')
      expect(error.param).toBe('email')
      expect(error.requestId).toBe('req_abc')
      expect(error.suggestion).toBe(
        'Use POST /api/v1/contacts to create a new contact first.'
      )
      expect(error.docs).toBe('https://docs.getbrew.io/api/contacts#errors')
    })
  })

  describe('fromResponse', () => {
    it('unwraps the { error: ... } envelope and maps every field', () => {
      const headers = new Headers({
        'x-request-id': 'req_xyz_789',
      })

      const error = BrewApiError.fromResponse({
        status: 422,
        headers,
        body: {
          error: {
            code: 'INVALID_REQUEST',
            type: 'invalid_request',
            message: 'email must be a valid email',
            param: 'email',
            suggestion: 'Use a valid RFC 5322 address.',
            docs: 'https://docs.getbrew.io/api/contacts#errors',
          },
        },
      })

      expect(error.status).toBe(422)
      expect(error.code).toBe('INVALID_REQUEST')
      expect(error.type).toBe('invalid_request')
      expect(error.message).toBe('email must be a valid email')
      expect(error.param).toBe('email')
      expect(error.suggestion).toBe('Use a valid RFC 5322 address.')
      expect(error.docs).toBe('https://docs.getbrew.io/api/contacts#errors')
      expect(error.requestId).toBe('req_xyz_789')
    })

    it('pulls requestId from the x-request-id response header', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers({ 'x-request-id': 'req_from_header' }),
        body: {
          error: {
            code: 'INTERNAL_ERROR',
            type: 'internal_error',
            message: 'boom',
            suggestion: 'Retry.',
            docs: 'https://docs.getbrew.io/api',
          },
        },
      })

      expect(error.requestId).toBe('req_from_header')
    })

    it('leaves requestId undefined when the header is missing', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: {
          error: {
            code: 'INTERNAL_ERROR',
            type: 'internal_error',
            message: 'boom',
            suggestion: 'Retry.',
            docs: 'https://docs.getbrew.io/api',
          },
        },
      })

      expect(error.requestId).toBeUndefined()
    })

    it('parses Retry-After header (seconds) into retryAfter as a number', () => {
      const error = BrewApiError.fromResponse({
        status: 429,
        headers: new Headers({ 'retry-after': '30' }),
        body: {
          error: {
            code: 'RATE_LIMITED',
            type: 'rate_limit',
            message: 'slow down',
            suggestion: 'Wait for the retry window.',
            docs: 'https://docs.getbrew.io/api/rate-limiting',
          },
        },
      })

      expect(error.retryAfter).toBe(30)
    })

    it('prefers retryAfter from the body envelope when both header and body are present', () => {
      const error = BrewApiError.fromResponse({
        status: 429,
        headers: new Headers({ 'retry-after': '10' }),
        body: {
          error: {
            code: 'RATE_LIMITED',
            type: 'rate_limit',
            message: 'slow down',
            suggestion: 'Wait for the retry window.',
            docs: 'https://docs.getbrew.io/api/rate-limiting',
            retryAfter: 42,
          },
        },
      })

      expect(error.retryAfter).toBe(42)
    })

    it('leaves retryAfter undefined when Retry-After header is missing and body has no retryAfter', () => {
      const error = BrewApiError.fromResponse({
        status: 429,
        headers: new Headers(),
        body: {
          error: {
            code: 'RATE_LIMITED',
            type: 'rate_limit',
            message: 'slow down',
            suggestion: 'Wait for the retry window.',
            docs: 'https://docs.getbrew.io/api/rate-limiting',
          },
        },
      })

      expect(error.retryAfter).toBeUndefined()
    })

    it('leaves retryAfter undefined when Retry-After header is non-numeric', () => {
      const error = BrewApiError.fromResponse({
        status: 429,
        headers: new Headers({ 'retry-after': 'not-a-number' }),
        body: {
          error: {
            code: 'RATE_LIMITED',
            type: 'rate_limit',
            message: 'slow down',
            suggestion: 'Wait for the retry window.',
            docs: 'https://docs.getbrew.io/api/rate-limiting',
          },
        },
      })

      expect(error.retryAfter).toBeUndefined()
    })

    it('parses a 402 payment_required envelope into its real code/type (not unknown_error)', () => {
      // Regression pin: payment_required was missing from VALID_ERROR_TYPES,
      // so real INSUFFICIENT_CREDITS envelopes degraded to unknown_error.
      const error = BrewApiError.fromResponse({
        status: 402,
        headers: new Headers(),
        body: {
          error: {
            code: 'INSUFFICIENT_CREDITS',
            type: 'payment_required',
            message: 'You have used all your credits for this period.',
            suggestion: 'Upgrade your plan or wait for the period reset.',
            docs: 'https://docs.brew.new/api-reference/api/credits',
          },
        },
      })

      expect(error.code).toBe('INSUFFICIENT_CREDITS')
      expect(error.type).toBe('payment_required')
      expect(error.status).toBe(402)
    })

    it('parses a 503 service_unavailable envelope into its real code/type (not unknown_error)', () => {
      // Regression pin: service_unavailable was missing from VALID_ERROR_TYPES.
      const error = BrewApiError.fromResponse({
        status: 503,
        headers: new Headers({ 'retry-after': '5' }),
        body: {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            type: 'service_unavailable',
            message: 'The email preview service is temporarily unavailable.',
            suggestion: 'Retry in a few seconds.',
            docs: 'https://docs.brew.new/api-reference/api/errors',
          },
        },
      })

      expect(error.code).toBe('SERVICE_UNAVAILABLE')
      expect(error.type).toBe('service_unavailable')
      expect(error.retryAfter).toBe(5)
    })

    it('falls back to a generic envelope when body is not a Brew error shape', () => {
      const error = BrewApiError.fromResponse({
        status: 502,
        headers: new Headers({ 'x-request-id': 'req_upstream' }),
        body: '<html>Bad Gateway</html>',
      })

      expect(error.status).toBe(502)
      expect(error.code).toBe('unknown_error')
      expect(error.type).toBe('internal_error')
      expect(error.message).toBe('Request failed with status 502')
      expect(error.requestId).toBe('req_upstream')
    })

    it('falls back when body is null', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: null,
      })

      expect(error.code).toBe('unknown_error')
      expect(error.type).toBe('internal_error')
      expect(error.message).toBe('Request failed with status 500')
    })

    it('falls back when body has no `error` key', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: { somethingElse: true },
      })

      expect(error.code).toBe('unknown_error')
      expect(error.type).toBe('internal_error')
    })

    it('falls back when error envelope is missing required fields', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: {
          error: {
            // missing suggestion + docs (both required per spec)
            code: 'INTERNAL_ERROR',
            type: 'internal_error',
            message: 'boom',
          },
        },
      })

      expect(error.code).toBe('unknown_error')
      expect(error.type).toBe('internal_error')
    })

    it('falls back when error envelope has an unknown type enum value', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: {
          error: {
            code: 'WEIRD',
            type: 'something_unrecognized',
            message: 'boom',
            suggestion: 'idk',
            docs: 'https://docs.getbrew.io/api',
          },
        },
      })

      expect(error.code).toBe('unknown_error')
    })
  })
})
