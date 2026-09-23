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

    it('keeps the code when only the advisory fields are missing', () => {
      // This used to assert `unknown_error`. Throwing away a usable
      // `INTERNAL_ERROR` because a cosmetic `suggestion` was absent cost the
      // caller the one field it branches on, to protect two it only prints.
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: {
          error: {
            code: 'INTERNAL_ERROR',
            type: 'internal_error',
            message: 'boom',
          },
        },
      })

      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.type).toBe('internal_error')
      expect(error.message).toBe('boom')
      expect(error.suggestion).toBe('')
    })

    it('falls back only when the envelope carries no code at all', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: { error: { message: 'boom' } },
      })

      expect(error.code).toBe('unknown_error')
    })

    it('keeps the code and derives the type from the status when the envelope names a type this SDK does not know', () => {
      // A newer server vocabulary must not cost the caller the `code` the
      // contract tells them to branch on, nor mislabel a 404 as a server
      // fault.
      const error = BrewApiError.fromResponse({
        status: 404,
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

      expect(error.code).toBe('WEIRD')
      expect(error.type).toBe('not_found')
      expect(error.message).toBe('boom')
    })
  })

  describe('fromResponse — the legacy fire envelope', () => {
    // The ONE endpoint outside the `{ error }` convention: trigger fire
    // (`POST`/`GET /v1/automations/triggers/{id}/fire`) answers failure with
    // `{ success: false, status, code, message, receivedAt, details? }`.
    // Regression pin: this body used to fall through to `unknown_error` /
    // `internal_error` / "Request failed with status 400" + retry advice, and
    // `details.errors[]` (which fields were wrong) was unreachable.
    const payloadMismatch = {
      success: false,
      status: 'payload_mismatch',
      code: 'INVALID_PAYLOAD',
      message: 'Payload validation failed.',
      triggerEventId: 'tri_signup',
      receivedAt: '2026-09-20T10:00:00.000Z',
      details: {
        errors: [
          {
            code: 'invalid_type',
            field: 'code',
            message: 'Field "code" must be a string',
            expectedType: 'string',
            actualType: 'number',
          },
        ],
        warnings: [],
        payloadSchema: {
          type: 'object',
          fields: [
            { key: 'email', type: 'string', required: true },
            { key: 'code', type: 'string', required: true },
          ],
        },
      },
    }

    it('maps a 400 payload_mismatch to its real code with the field errors attached', () => {
      const error = BrewApiError.fromResponse({
        status: 400,
        headers: new Headers({
          'x-request-id': 'req_0ee060a1c22345d49734cbea819620c3',
        }),
        body: payloadMismatch,
      })

      expect(error.status).toBe(400)
      expect(error.code).toBe('INVALID_PAYLOAD')
      expect(error.type).toBe('invalid_request')
      expect(error.message).toBe('Payload validation failed.')
      expect(error.requestId).toBe('req_0ee060a1c22345d49734cbea819620c3')
      expect(error.details).toEqual(payloadMismatch.details)
      expect(error.body).toBe(payloadMismatch)
      // The same body fails the same way on retry — never advise one.
      expect(error.suggestion).not.toMatch(/retry/i)
      expect(error.docs).toBe(
        'https://docs.brew.new/api-reference/public-v1/automations/fire-a-trigger'
      )
    })

    it.each([
      [404, 'TRIGGER_EVENT_NOT_FOUND', 'trigger_event_not_found', 'not_found'],
      [403, 'BRAND_SCOPE_MISMATCH', 'forbidden', 'authorization_error'],
      [422, 'NO_PUBLISHED_AUTOMATION', 'failed', 'invalid_request'],
      [409, 'IDEMPOTENCY_CONFLICT', 'failed', 'conflict'],
      [500, 'INTERNAL_ERROR', 'failed', 'internal_error'],
    ] as const)(
      'derives type from the HTTP status: %i %s → %s',
      (status, code, legacyStatus, expectedType) => {
        const error = BrewApiError.fromResponse({
          status,
          headers: new Headers(),
          body: {
            success: false,
            status: legacyStatus,
            code,
            message: `${code} happened`,
            receivedAt: '2026-09-20T10:00:00.000Z',
          },
        })

        expect(error.code).toBe(code)
        expect(error.type).toBe(expectedType)
        expect(error.message).toBe(`${code} happened`)
        expect(error.details).toBeUndefined()
        // The envelope's own discriminator stays reachable through `body`.
        expect((error.body as { status: string }).status).toBe(legacyStatus)
      }
    )

    it('only advises a retry for the transient statuses the retry policy retries', () => {
      const legacy = ({ status }: { status: number }) =>
        BrewApiError.fromResponse({
          status,
          headers: new Headers(),
          body: { success: false, status: 'failed', code: 'X', message: 'x' },
        })

      // The retry policy's own set (408, 429, 5xx): after the automatic
      // retries a retry is still the honest remedy.
      expect(legacy({ status: 500 }).suggestion).toMatch(/retry/i)
      expect(legacy({ status: 429 }).suggestion).toMatch(/retry/i)
      expect(legacy({ status: 408 }).suggestion).toMatch(/retry/i)
      // Not in the policy — 425 included — so no retry advice.
      expect(legacy({ status: 425 }).suggestion).not.toMatch(/retry/i)
      expect(legacy({ status: 404 }).suggestion).not.toMatch(/retry/i)
      expect(legacy({ status: 400 }).suggestion).not.toMatch(/retry/i)
    })

    it('classifies an unlisted 4xx as invalid_request, never internal_error', () => {
      const error = BrewApiError.fromResponse({
        status: 413,
        headers: new Headers(),
        body: {
          success: false,
          status: 'failed',
          code: 'TOO_LARGE',
          message: 'x',
        },
      })

      expect(error.type).toBe('invalid_request')
    })

    it('does not claim a `success: true` body as a refusal', () => {
      const error = BrewApiError.fromResponse({
        status: 500,
        headers: new Headers(),
        body: {
          success: true,
          status: 'triggered',
          code: 'TRIGGERED',
          message: 'ok',
        },
      })

      expect(error.code).toBe('unknown_error')
    })

    it('requires `success: false` — a bare { code, message } is not a fire refusal', () => {
      // A proxy or an unrelated endpoint answering `{ code, message }` must
      // not be labelled with the fire reference; the contract says a fire
      // refusal carries `success: false`.
      const error = BrewApiError.fromResponse({
        status: 400,
        headers: new Headers(),
        body: { code: 'BAD_GATEWAY_CONFIG', message: 'nope' },
      })

      expect(error.code).toBe('unknown_error')
      expect(error.docs).toBe('https://docs.brew.new/api-reference/api/errors')
    })
  })

  describe('fromResponse — details and body on every shape', () => {
    it('keeps `details` from the standard envelope', () => {
      const body = {
        error: {
          code: 'FIELD_TYPE_MISMATCH',
          type: 'conflict',
          message: "Field 'score' already exists with type number.",
          param: 'score',
          suggestion: 'Use the existing type or pick another name.',
          docs: 'https://docs.brew.new/api-reference/api/errors',
          details: { existingType: 'number', requestedType: 'string' },
        },
      }

      const error = BrewApiError.fromResponse({
        status: 409,
        headers: new Headers(),
        body,
      })

      expect(error.code).toBe('FIELD_TYPE_MISMATCH')
      expect(error.details).toEqual(body.error.details)
      expect(error.body).toBe(body)
    })

    it('the generic fallback derives type from the status and links the live docs host', () => {
      const error = BrewApiError.fromResponse({
        status: 404,
        headers: new Headers(),
        body: '<html>Not Found</html>',
      })

      expect(error.code).toBe('unknown_error')
      expect(error.type).toBe('not_found')
      expect(error.docs).toBe('https://docs.brew.new/api-reference/api/errors')
      expect(error.body).toBe('<html>Not Found</html>')
      expect(error.details).toBeUndefined()
    })

    it('a non-enveloped 413 from a proxy is invalid_request, a 408 keeps retry advice', () => {
      const tooLarge = BrewApiError.fromResponse({
        status: 413,
        headers: new Headers(),
        body: '<html>Payload Too Large</html>',
      })
      const timeout = BrewApiError.fromResponse({
        status: 408,
        headers: new Headers(),
        body: null,
      })

      expect(tooLarge.type).toBe('invalid_request')
      expect(tooLarge.suggestion).not.toMatch(/retry/i)
      expect(timeout.type).toBe('invalid_request')
      expect(timeout.suggestion).toMatch(/retry/i)
    })
  })
})
