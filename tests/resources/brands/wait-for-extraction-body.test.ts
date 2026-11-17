import { describe, expect, it } from 'vitest'

import {
  BrewBrandExtractionTimeoutError,
  createBrewClient,
} from '../../../src/index'
import {
  afterHeaders,
  STALL_TEST,
  stallingBodyRoute,
  useLoopbackServers,
} from '../../helpers/loopback-server'

const loopback = useLoopbackServers()

describe('brand extraction total deadline', () => {
  it(
    'cancels a stalled response body after headers without retrying',
    STALL_TEST,
    async () => {
      const remote = await loopback.start({ route: stallingBodyRoute })
      const observed = afterHeaders()
      const brew = createBrewClient({
        apiKey: 'brew_test',
        baseUrl: remote.baseUrl,
        fetch: observed.fetch,
        timeoutMs: 30_000,
        maxRetries: 2,
      })

      await expect(
        brew.brands.waitForExtraction('brand_wait', { maxWaitMs: 500 })
      ).rejects.toBeInstanceOf(BrewBrandExtractionTimeoutError)
      expect(observed.wereHeadersReceived()).toBe(true)
      expect(remote.requests).toHaveLength(1)
    }
  )
})
