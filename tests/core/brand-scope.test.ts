import { describe, expect, it } from 'vitest'

import { createBrewClient } from '../../src/client'
import { resolveConfig } from '../../src/core/config'
import { buildHeaders } from '../../src/core/headers'

describe('buildHeaders — X-Brand-Id', () => {
  const base = { apiKey: 'brew_test_abc', userAgent: 'brew.new-sdk/0.0.0' }

  it('omits the header entirely when no brand is pinned', () => {
    expect(buildHeaders(base).get('x-brand-id')).toBeNull()
  })

  it('sets the header when a brand is pinned', () => {
    const headers = buildHeaders({ ...base, brandId: 'brand_1' })
    expect(headers.get('x-brand-id')).toBe('brand_1')
  })

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

  it('carries transport tuning onto the pinned client', () => {
    const tuning = { sleep: () => Promise.resolve() }
    const brew = createBrewClient({ apiKey: 'brew_test_abc' }, tuning)
    const scoped = brew.withBrand('brand_1')
    expect(Object.keys(scoped).sort()).toEqual(Object.keys(brew).sort())
  })
})

describe('brands resource', () => {
  it('exposes lifecycle reads, creation, and bounded extraction waiting', () => {
    const brew = createBrewClient({ apiKey: 'brew_test_abc' })
    expect(Object.keys(brew.brands).sort()).toEqual([
      'create',
      'get',
      'list',
      'waitForExtraction',
    ])
  })
})
