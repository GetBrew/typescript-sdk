import { describe, expect, it } from 'vitest'

import { BrewApiError } from '../../src/core/errors'

describe('BrewApiError', () => {
  describe('constructor', () => {
    it('extends Error so `instanceof Error` stays true', () => {
      const error = new BrewApiError({
        message: 'boom',
        status: 500,
        code: 'internal_error',
        type: 'server_error',
        requestId: undefined,
        retryAfter: undefined,
        suggestion: undefined,
        docs: undefined,
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
        code: 'contact_not_found',
        type: 'not_found',
        requestId: 'req_abc',
        retryAfter: 12,
        suggestion: 'Double-check the email.',
        docs: 'https://brew.new/docs/errors#contact_not_found',
      })

      expect(error.status).toBe(404)
      expect(error.code).toBe('contact_not_found')
      expect(error.type).toBe('not_found')
      expect(error.requestId).toBe('req_abc')
      expect(error.retryAfter).toBe(12)
      expect(error.suggestion).toBe('Double-check the email.')
      expect(error.docs).toBe('https://brew.new/docs/errors#contact_not_found')
    })
  })

  describe('fromResponse', () => {
    it('maps a well-formed Brew error envelope onto the error', () => {
      const headers = new Headers({
        'x-request-id': 'req_xyz_789',
      })

      const error = BrewApiError.fromResponse({
        status: 422,
        headers,
        body: {
          code: 'validation_failed',
          type: 'invalid_request',
          message: 'email must be a valid email',
          suggestion: 'Use a valid RFC 5322 address.',
          docs: 'https://brew.new/docs/errors#validation_failed',
        },
      })

      expect(error.status).toBe(422)
      expect(error.code).toBe('validation_failed')
      expect(error.type).toBe('invalid_request')
      expect(error.message).toBe('email must be a valid email')
      expect(error.suggestion).toBe('Use a valid RFC 5322 address.')
      expect(error.docs).toBe('https://brew.new/docs/errors#validation_failed')
      expect(error.requestId).toBe('req_xyz_789')
    })

    it('pulls requestId from the x-request-id response header', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers({ 'x-request-id': 'req_from_header' }),
        body: {
          code: 'internal_error',
          type: 'server_error',
          message: 'boom',
        },
      })

      expect(error.requestId).toBe('req_from_header')
    })

    it('leaves requestId undefined when the header is missing', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: {
          code: 'internal_error',
          type: 'server_error',
          message: 'boom',
        },
      })

      expect(error.requestId).toBeUndefined()
    })

    it('parses Retry-After (seconds) into retryAfter as a number', () => {
      const error = BrewApiError.fromResponse({
        status: 429,
        headers: new Headers({ 'retry-after': '30' }),
        body: {
          code: 'rate_limited',
          type: 'rate_limit',
          message: 'slow down',
        },
      })

      expect(error.retryAfter).toBe(30)
    })

    it('leaves retryAfter undefined when Retry-After is missing', () => {
      const error = BrewApiError.fromResponse({
        status: 429,
        headers: new Headers(),
        body: {
          code: 'rate_limited',
          type: 'rate_limit',
          message: 'slow down',
        },
      })

      expect(error.retryAfter).toBeUndefined()
    })

    it('leaves retryAfter undefined when Retry-After is not a number', () => {
      const error = BrewApiError.fromResponse({
        status: 429,
        headers: new Headers({ 'retry-after': 'not-a-number' }),
        body: {
          code: 'rate_limited',
          type: 'rate_limit',
          message: 'slow down',
        },
      })

      expect(error.retryAfter).toBeUndefined()
    })

    it('falls back to a generic envelope when body is not a Brew error shape', () => {
      const error = BrewApiError.fromResponse({
        status: 502,
        headers: new Headers({ 'x-request-id': 'req_upstream' }),
        body: '<html>Bad Gateway</html>',
      })

      expect(error.status).toBe(502)
      expect(error.code).toBe('unknown_error')
      expect(error.type).toBe('unknown')
      expect(error.message).toBe('Request failed with status 502')
      expect(error.requestId).toBe('req_upstream')
      expect(error.suggestion).toBeUndefined()
      expect(error.docs).toBeUndefined()
    })

    it('falls back when body is null', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: null,
      })

      expect(error.code).toBe('unknown_error')
      expect(error.type).toBe('unknown')
      expect(error.message).toBe('Request failed with status 500')
    })

    it('falls back when envelope is partially shaped (missing required fields)', () => {
      // A response that has a body object but lacks `code` or `type`.
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: { somethingElse: true },
      })

      expect(error.code).toBe('unknown_error')
      expect(error.type).toBe('unknown')
    })

    it('leaves suggestion/docs undefined when envelope omits them', () => {
      const error = BrewApiError.fromResponse({
        status: 404,
        headers: new Headers(),
        body: {
          code: 'contact_not_found',
          type: 'not_found',
          message: 'not found',
        },
      })

      expect(error.suggestion).toBeUndefined()
      expect(error.docs).toBeUndefined()
    })
  })
})
