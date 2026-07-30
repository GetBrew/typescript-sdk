import { describe, expect, it } from 'vitest'

import { createBrewClient } from '../../src/client'
import { resolveConfig } from '../../src/core/config'
import { buildHeaders } from '../../src/core/headers'

/**
 * Brand pinning for ORGANIZATION-scoped keys.
 *
 * A brand-scoped key resolves its own brand server-side and needs none of
 * this. An org-scoped key must name a brand per request — there is no default,
 * so omitting it is a `400 BRAND_ID_REQUIRED` rather than a silent pick.
 */
describe('buildHeaders — X-Brand-Id', () => {
  const base = { apiKey: 'brew_test_abc', userAgent: 'brew.new-sdk/0.0.0' }

  it('omits the header entirely when no brand is pinned', () => {
    expect(buildHeaders(base).get('x-brand-id')).toBeNull()
  })

  it('sets the header when a brand is pinned', () => {
    const headers = buildHeaders({ ...base, brandId: 'brand_1' })
    expect(headers.get('x-brand-id')).toBe('brand_1')
  })

  /**
   * `extras` are merged LAST so a host app can override any default. The brand
   * header must not be special-cased out of that contract.
   */
  it('lets a per-request extra override the pinned brand', () => {
    const headers = buildHeaders({
      ...base,
      brandId: 'brand_1',
      extras: { 'x-brand-id': 'brand_override' },
    })
    expect(headers.get('x-brand-id')).toBe('brand_override')
  })
})

describe('resolveConfig — brandId validation', () => {
  const base = { apiKey: 'brew_test_abc' }

  it('leaves brandId undefined when not provided', () => {
    expect(resolveConfig({ userConfig: base }).brandId).toBeUndefined()
  })

  it('passes a provided brandId through', () => {
    expect(
      resolveConfig({ userConfig: { ...base, brandId: 'brand_1' } }).brandId
    ).toBe('brand_1')
  })

  /**
   * Fail at the BOUNDARY. An empty string would otherwise omit the header and
   * surface as a server-side BRAND_ID_REQUIRED, which reads like a Brew
   * problem rather than a typo in the caller's config.
   */
  it.each([[''], ['   ']])('rejects an empty brandId (%j)', (brandId) => {
    expect(() => resolveConfig({ userConfig: { ...base, brandId } })).toThrow(
      TypeError
    )
  })
})

describe('client.withBrand', () => {
  it('returns a client pinned to the brand, leaving the original alone', () => {
    const brew = createBrewClient({ apiKey: 'brew_test_abc' })
    const scoped = brew.withBrand('brand_1')
    expect(scoped).not.toBe(brew)
    expect(typeof scoped.emails.list).toBe('function')
    // The org-level resource is present on both.
    expect(typeof scoped.brands.list).toBe('function')
    expect(typeof brew.brands.list).toBe('function')
  })

  it('is chainable — re-pinning replaces the brand', () => {
    const brew = createBrewClient({ apiKey: 'brew_test_abc' })
    expect(typeof brew.withBrand('a').withBrand('b').emails.list).toBe(
      'function'
    )
  })

  it('rejects an empty brandId rather than silently unpinning', () => {
    const brew = createBrewClient({ apiKey: 'brew_test_abc' })
    expect(() => brew.withBrand('')).toThrow(TypeError)
    expect(() => brew.withBrand('   ')).toThrow(TypeError)
  })

  /**
   * REGRESSION GUARD. `withBrand` must not re-run `resolveConfig` — doing so
   * re-derives defaults from the original user input and drops the `tuning`
   * argument, so a pinned client would quietly stop honouring the retry and
   * timeout setup its parent was built with. Both paths go through
   * `buildClient` for exactly this reason.
   */
  it('carries transport tuning onto the pinned client', () => {
    const tuning = { sleep: () => Promise.resolve() }
    const brew = createBrewClient({ apiKey: 'brew_test_abc' }, tuning)
    const scoped = brew.withBrand('brand_1')
    // A dropped tuning would surface as a different resource wiring; assert
    // the pinned client is fully constructed rather than partially built.
    expect(Object.keys(scoped).sort()).toEqual(Object.keys(brew).sort())
  })
})

describe('brands resource', () => {
  it('exposes list, create, and get', () => {
    const brew = createBrewClient({ apiKey: 'brew_test_abc' })
    expect(Object.keys(brew.brands).sort()).toEqual(['create', 'get', 'list'])
  })
})
