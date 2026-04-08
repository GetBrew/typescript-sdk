import { describe, expect, it } from 'vitest'

import {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  resolveConfig,
} from '../../src/core/config'

describe('resolveConfig', () => {
  describe('defaults', () => {
    it('applies every default when only apiKey is provided', () => {
      const config = resolveConfig({
        userConfig: { apiKey: 'brew_test_abc' },
      })

      expect(config.apiKey).toBe('brew_test_abc')
      expect(config.baseUrl).toBe(DEFAULT_BASE_URL)
      expect(config.timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
      expect(config.maxRetries).toBe(DEFAULT_MAX_RETRIES)
      expect(config.userAgent).toBe(DEFAULT_USER_AGENT)
      expect(typeof config.fetch).toBe('function')
    })

    it('pins DEFAULT_BASE_URL to https://brew.new/api', () => {
      expect(DEFAULT_BASE_URL).toBe('https://brew.new/api')
    })

    it('pins DEFAULT_TIMEOUT_MS to 30 seconds', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(30_000)
    })

    it('pins DEFAULT_MAX_RETRIES to 2', () => {
      expect(DEFAULT_MAX_RETRIES).toBe(2)
    })

    it('DEFAULT_USER_AGENT identifies this SDK by name', () => {
      expect(DEFAULT_USER_AGENT).toMatch(/^brew-typescript-sdk\//)
    })
  })

  describe('overrides', () => {
    it('accepts a custom baseUrl', () => {
      const config = resolveConfig({
        userConfig: {
          apiKey: 'brew_test_abc',
          baseUrl: 'https://staging.brew.new/api',
        },
      })
      expect(config.baseUrl).toBe('https://staging.brew.new/api')
    })

    it('accepts a custom timeoutMs', () => {
      const config = resolveConfig({
        userConfig: { apiKey: 'brew_test_abc', timeoutMs: 5_000 },
      })
      expect(config.timeoutMs).toBe(5_000)
    })

    it('accepts a custom maxRetries (including zero)', () => {
      const config = resolveConfig({
        userConfig: { apiKey: 'brew_test_abc', maxRetries: 0 },
      })
      expect(config.maxRetries).toBe(0)
    })

    it('accepts a custom userAgent', () => {
      const config = resolveConfig({
        userConfig: {
          apiKey: 'brew_test_abc',
          userAgent: 'my-app/1.2.3',
        },
      })
      expect(config.userAgent).toBe('my-app/1.2.3')
    })

    it('accepts a custom fetch implementation and preserves the reference', () => {
      const customFetch: typeof globalThis.fetch = () =>
        Promise.resolve(new Response(null))

      const config = resolveConfig({
        userConfig: { apiKey: 'brew_test_abc', fetch: customFetch },
      })

      expect(config.fetch).toBe(customFetch)
    })
  })

  describe('validation', () => {
    it('throws when apiKey is an empty string', () => {
      expect(() => resolveConfig({ userConfig: { apiKey: '' } })).toThrow(
        /apiKey/
      )
    })

    it('throws when apiKey is a whitespace-only string', () => {
      expect(() => resolveConfig({ userConfig: { apiKey: '   ' } })).toThrow(
        /apiKey/
      )
    })
  })
})
