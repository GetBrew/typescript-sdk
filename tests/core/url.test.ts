import { describe, expect, it } from 'vitest'

import { buildUrl } from '../../src/core/url'

describe('buildUrl', () => {
  const baseUrl = 'https://brew.new/api'

  describe('path joining', () => {
    it('joins base + path with a single slash', () => {
      expect(buildUrl({ baseUrl, path: '/v1/contacts' })).toBe(
        'https://brew.new/api/v1/contacts'
      )
    })

    it('collapses a trailing slash on baseUrl', () => {
      expect(
        buildUrl({ baseUrl: 'https://brew.new/api/', path: '/v1/contacts' })
      ).toBe('https://brew.new/api/v1/contacts')
    })

    it('adds the separating slash when path has no leading slash', () => {
      expect(buildUrl({ baseUrl, path: 'v1/contacts' })).toBe(
        'https://brew.new/api/v1/contacts'
      )
    })

    it('handles both a trailing baseUrl slash and a leading path slash without doubling up', () => {
      expect(
        buildUrl({ baseUrl: 'https://brew.new/api/', path: '/v1/contacts' })
      ).toBe('https://brew.new/api/v1/contacts')
    })
  })

  describe('path params', () => {
    it('substitutes a single :param with a URL-encoded value', () => {
      expect(
        buildUrl({
          baseUrl,
          path: '/v1/contacts/:email',
          pathParams: { email: 'jane@example.com' },
        })
      ).toBe('https://brew.new/api/v1/contacts/jane%40example.com')
    })

    it('substitutes multiple path params', () => {
      expect(
        buildUrl({
          baseUrl,
          path: '/v1/workspaces/:workspaceId/contacts/:email',
          pathParams: {
            workspaceId: 'ws_123',
            email: 'jane@example.com',
          },
        })
      ).toBe(
        'https://brew.new/api/v1/workspaces/ws_123/contacts/jane%40example.com'
      )
    })

    it('throws when the path references a param that was not provided', () => {
      expect(() =>
        buildUrl({
          baseUrl,
          path: '/v1/contacts/:email',
          pathParams: {},
        })
      ).toThrow(/email/)
    })
  })

  describe('query params', () => {
    it('does not append a trailing ? when query is empty', () => {
      expect(buildUrl({ baseUrl, path: '/v1/contacts', query: {} })).toBe(
        'https://brew.new/api/v1/contacts'
      )
    })

    it('does not append a trailing ? when query is omitted', () => {
      expect(buildUrl({ baseUrl, path: '/v1/contacts' })).toBe(
        'https://brew.new/api/v1/contacts'
      )
    })

    it('serializes string values', () => {
      expect(
        buildUrl({
          baseUrl,
          path: '/v1/contacts',
          query: { email: 'jane@example.com' },
        })
      ).toBe('https://brew.new/api/v1/contacts?email=jane%40example.com')
    })

    it('serializes number and boolean values', () => {
      expect(
        buildUrl({
          baseUrl,
          path: '/v1/contacts',
          query: { limit: 100, includeArchived: true },
        })
      ).toBe('https://brew.new/api/v1/contacts?limit=100&includeArchived=true')
    })

    it('skips undefined and null values', () => {
      expect(
        buildUrl({
          baseUrl,
          path: '/v1/contacts',
          query: {
            limit: 100,
            cursor: undefined,
            tag: null,
          },
        })
      ).toBe('https://brew.new/api/v1/contacts?limit=100')
    })

    it('serializes array values as repeated keys', () => {
      expect(
        buildUrl({
          baseUrl,
          path: '/v1/contacts',
          query: { tag: ['a', 'b', 'c'] },
        })
      ).toBe('https://brew.new/api/v1/contacts?tag=a&tag=b&tag=c')
    })

    it('URL-encodes reserved characters inside query values', () => {
      expect(
        buildUrl({
          baseUrl,
          path: '/v1/contacts',
          query: { q: 'hello world & friends' },
        })
      ).toBe('https://brew.new/api/v1/contacts?q=hello+world+%26+friends')
    })
  })

  describe('path params + query params together', () => {
    it('substitutes path params and appends query in the right order', () => {
      expect(
        buildUrl({
          baseUrl,
          path: '/v1/contacts/:email/fields',
          pathParams: { email: 'jane@example.com' },
          query: { limit: 10 },
        })
      ).toBe(
        'https://brew.new/api/v1/contacts/jane%40example.com/fields?limit=10'
      )
    })
  })
})
