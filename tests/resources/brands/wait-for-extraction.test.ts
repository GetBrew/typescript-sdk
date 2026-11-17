import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BrewApiError,
  BrewBrandExtractionTimeoutError,
  createBrewClient,
  type GetBrandStatusResponse,
} from '../../../src/index'
import { server } from '../../msw/server'

const baseUrl = 'https://brew.new/api'
const extracting: GetBrandStatusResponse = {
  brandId: 'brand_wait',
  domain: 'example.com',
  status: 'extracting',
  ready: false,
  progress: 25,
  phase: 'Crawling',
}
const completed: GetBrandStatusResponse = {
  ...extracting,
  status: 'completed',
  ready: true,
  progress: 100,
}

afterEach(() => vi.restoreAllMocks())

describe('brands.waitForExtraction', () => {
  it('polls immediately, waits between extracting reads, and returns the final row', async () => {
    let calls = 0
    server.use(
      http.get(`${baseUrl}/v1/brands/brand_wait`, () => {
        calls += 1
        return HttpResponse.json(calls < 3 ? extracting : completed)
      })
    )
    const brew = createBrewClient({ apiKey: 'brew_test' })

    await expect(
      brew.brands.waitForExtraction('brand_wait', { pollIntervalMs: 1 })
    ).resolves.toEqual(completed)
    expect(calls).toBe(3)
  })

  it.each([
    { ...completed, ready: false },
    { ...extracting, status: 'failed' as const, error: 'Could not read site' },
    { ...extracting, status: 'deleting' as const },
  ])(
    'returns a terminal $status row without assuming readiness',
    async (status) => {
      let calls = 0
      server.use(
        http.get(`${baseUrl}/v1/brands/brand_wait`, () => {
          calls += 1
          return HttpResponse.json(status)
        })
      )
      const brew = createBrewClient({ apiKey: 'brew_test' })

      await expect(
        brew.brands.waitForExtraction('brand_wait')
      ).resolves.toEqual(status)
      expect(calls).toBe(1)
    }
  )

  it('encodes the positional brand ID and omits a pinned brand header', async () => {
    server.use(
      http.get(`${baseUrl}/v1/brands/:brandId`, ({ params, request }) => {
        expect(params.brandId).toBe('brand/slash')
        expect(request.headers.get('x-brand-id')).toBeNull()
        return HttpResponse.json({ ...completed, brandId: 'brand/slash' })
      })
    )
    const brew = createBrewClient({ apiKey: 'brew_test' }).withBrand('another')

    const result = await brew.brands.waitForExtraction('brand/slash')
    expect(result.brandId).toBe('brand/slash')
  })

  it('retains ordinary transport retries and returns nonretryable API errors', async () => {
    let calls = 0
    server.use(
      http.get(`${baseUrl}/v1/brands/brand_wait`, () => {
        calls += 1
        if (calls === 1) return new HttpResponse(null, { status: 503 })
        return HttpResponse.json(completed)
      }),
      http.get(`${baseUrl}/v1/brands/missing`, () =>
        HttpResponse.json(
          { error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found.' } },
          { status: 404 }
        )
      )
    )
    const brew = createBrewClient({ apiKey: 'brew_test' })

    await expect(brew.brands.waitForExtraction('brand_wait')).resolves.toEqual(
      completed
    )
    expect(calls).toBe(2)
    await expect(
      brew.brands.waitForExtraction('missing')
    ).rejects.toMatchObject({
      constructor: BrewApiError,
      status: 404,
      code: 'BRAND_NOT_FOUND',
    })
  })

  it.each(['request', 'client'] as const)(
    'preserves a %s abort reason while sleeping and makes no further request',
    async (source) => {
      const abort = new AbortController()
      const reason = { stopped: source }
      let calls = 0
      const timer = vi.spyOn(globalThis, 'setTimeout')
      server.use(
        http.get(`${baseUrl}/v1/brands/brand_wait`, () => {
          calls += 1
          return HttpResponse.json(extracting)
        })
      )
      const brew = createBrewClient({
        apiKey: 'brew_test',
        ...(source === 'client' ? { signal: abort.signal } : {}),
      })
      const waiting = brew.brands.waitForExtraction('brand_wait', {
        ...(source === 'request' ? { signal: abort.signal } : {}),
      })
      const assertion = expect(waiting).rejects.toBe(reason)
      await vi.waitFor(() =>
        expect(timer.mock.calls.some(([, ms]) => ms === 5_000)).toBe(true)
      )
      abort.abort(reason)

      await assertion
      expect(calls).toBe(1)
    }
  )

  it('preserves a pre-aborted reason without making a request', async () => {
    const abort = new AbortController()
    abort.abort('already stopped')
    const fetcher = vi.fn<typeof fetch>()
    const brew = createBrewClient({ apiKey: 'brew_test', fetch: fetcher })

    await expect(
      brew.brands.waitForExtraction('brand_wait', { signal: abort.signal })
    ).rejects.toBe('already stopped')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('preserves HTTP signal precedence when both caller signals are already aborted', async () => {
    const clientAbort = new AbortController()
    const requestAbort = new AbortController()
    clientAbort.abort('client stopped')
    requestAbort.abort('request stopped')
    const brew = createBrewClient({
      apiKey: 'brew_test',
      signal: clientAbort.signal,
    })

    await expect(
      brew.brands.waitForExtraction('brand_wait', {
        signal: requestAbort.signal,
      })
    ).rejects.toBe('request stopped')
  })

  it('bounds polling sleeps and includes the latest lifecycle row in its typed deadline error', async () => {
    let calls = 0
    server.use(
      http.get(`${baseUrl}/v1/brands/brand_wait`, () => {
        calls += 1
        return HttpResponse.json(extracting)
      })
    )
    const brew = createBrewClient({ apiKey: 'brew_test' })

    await expect(
      brew.brands.waitForExtraction('brand_wait', { maxWaitMs: 100 })
    ).rejects.toMatchObject({
      constructor: BrewBrandExtractionTimeoutError,
      brandId: 'brand_wait',
      maxWaitMs: 100,
      lastStatus: extracting,
    })
    expect(calls).toBe(1)
  })

  it('bounds an in-flight GET rather than waiting for its per-attempt timeout', async () => {
    let signal: AbortSignal | undefined
    server.use(
      http.get(`${baseUrl}/v1/brands/brand_wait`, async ({ request }) => {
        signal = request.signal
        await delay('infinite')
        return HttpResponse.json(completed)
      })
    )
    const brew = createBrewClient({ apiKey: 'brew_test', timeoutMs: 30_000 })

    await expect(
      brew.brands.waitForExtraction('brand_wait', { maxWaitMs: 100 })
    ).rejects.toMatchObject({
      constructor: BrewBrandExtractionTimeoutError,
      lastStatus: undefined,
    })
    expect(signal?.aborted).toBe(true)
  })

  it('bounds Retry-After backoff within the total deadline', async () => {
    let calls = 0
    server.use(
      http.get(`${baseUrl}/v1/brands/brand_wait`, () => {
        calls += 1
        return new HttpResponse(null, {
          status: 429,
          headers: { 'Retry-After': '60' },
        })
      })
    )
    const brew = createBrewClient({ apiKey: 'brew_test', maxRetries: 2 })

    await expect(
      brew.brands.waitForExtraction('brand_wait', { maxWaitMs: 100 })
    ).rejects.toBeInstanceOf(BrewBrandExtractionTimeoutError)
    expect(calls).toBe(1)
  })

  it.each([0, -1, Infinity, NaN, 2_147_483_648, 0.5])(
    'rejects invalid timing %s before networking',
    async (value) => {
      const fetcher = vi.fn<typeof fetch>()
      const brew = createBrewClient({ apiKey: 'brew_test', fetch: fetcher })

      await expect(
        brew.brands.waitForExtraction('brand_wait', { maxWaitMs: value })
      ).rejects.toBeInstanceOf(TypeError)
      await expect(
        brew.brands.waitForExtraction('brand_wait', { pollIntervalMs: value })
      ).rejects.toBeInstanceOf(TypeError)
      expect(fetcher).not.toHaveBeenCalled()
    }
  )
})
