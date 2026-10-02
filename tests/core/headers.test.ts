import { describe, expect, it } from 'vitest'

import { buildHeaders, buildUploadHeaders } from '../../src/core/headers'

describe('buildHeaders', () => {
  const baseInput = {
    apiKey: 'brew_test_abc',
    userAgent: 'brew.new-sdk/0.0.0',
  }

  it('sets Authorization to a Bearer token with the API key', () => {
    const headers = buildHeaders(baseInput)
    expect(headers.get('authorization')).toBe('Bearer brew_test_abc')
  })

  it('sets User-Agent from the resolved config', () => {
    const headers = buildHeaders(baseInput)
    expect(headers.get('user-agent')).toBe('brew.new-sdk/0.0.0')
  })

  it('always sets Accept to application/json', () => {
    const headers = buildHeaders(baseInput)
    expect(headers.get('accept')).toBe('application/json')
  })

  it('does NOT set Content-Type when the request has no body', () => {
    const headers = buildHeaders({ ...baseInput, hasBody: false })
    expect(headers.get('content-type')).toBeNull()
  })

  it('sets Content-Type to application/json when the request has a body', () => {
    const headers = buildHeaders({ ...baseInput, hasBody: true })
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('does NOT set Idempotency-Key when none is provided', () => {
    const headers = buildHeaders(baseInput)
    expect(headers.get('idempotency-key')).toBeNull()
  })

  it('sets Idempotency-Key when provided', () => {
    const headers = buildHeaders({
      ...baseInput,
      idempotencyKey: 'idem_abc_123',
    })
    expect(headers.get('idempotency-key')).toBe('idem_abc_123')
  })

  it('merges extras on top of the defaults', () => {
    const headers = buildHeaders({
      ...baseInput,
      extras: {
        'x-trace-id': 'trace_xyz',
      },
    })
    expect(headers.get('x-trace-id')).toBe('trace_xyz')
    expect(headers.get('authorization')).toBe('Bearer brew_test_abc')
  })

  it('lets extras override a default header (last writer wins)', () => {
    const headers = buildHeaders({
      ...baseInput,
      extras: {
        'user-agent': 'custom-override/1.0',
      },
    })
    expect(headers.get('user-agent')).toBe('custom-override/1.0')
  })

  it('returns an independent Headers instance on each call (no shared mutation)', () => {
    const a = buildHeaders(baseInput)
    const b = buildHeaders(baseInput)
    a.set('x-mutated', 'yes')
    expect(b.get('x-mutated')).toBeNull()
  })
})

describe('buildUploadHeaders', () => {
  const input = {
    userAgent: 'brew.new-sdk/0.0.0',
    contentType: 'image/png',
  }

  it('sends no credential: the upload URL carries its own', () => {
    const headers = buildUploadHeaders(input)
    expect(headers.get('authorization')).toBeNull()
    expect(headers.get('x-api-key')).toBeNull()
    expect(headers.get('x-brand-id')).toBeNull()
    expect(headers.get('idempotency-key')).toBeNull()
  })

  it('names the body type, the SDK and the JSON answer it reads', () => {
    const headers = buildUploadHeaders(input)
    expect(headers.get('content-type')).toBe('image/png')
    expect(headers.get('user-agent')).toBe('brew.new-sdk/0.0.0')
    expect(headers.get('accept')).toBe('application/json')
  })
})
