import { resolveConfig } from '../../src/core/config'
import { createHttpClient, type HttpTuning } from '../../src/core/http'
import type { BrewClientConfig } from '../../src/types'

/**
 * Shared test harness for tests that need a real `HttpClient` talking to
 * MSW-mocked endpoints.
 *
 * Returns:
 *   - `client` — an http client wired to fast, deterministic retry tuning
 *     (base/max backoff = 1 ms, random = 0) so retries happen instantly.
 *   - `sleepCalls` — every duration the retry loop passed to `sleep`,
 *     captured so tests can assert on `Retry-After` propagation without
 *     actually waiting.
 *
 * Accepts overrides on both the public `BrewClientConfig` (apiKey,
 * baseUrl, maxRetries, etc.) and the internal `HttpTuning` (for tests
 * that want to swap out `sleep` or `random`).
 */
export function makeTestHttpClient({
  configOverrides = {},
  tuningOverrides = {},
}: {
  configOverrides?: Partial<BrewClientConfig>
  tuningOverrides?: HttpTuning
} = {}): {
  client: ReturnType<typeof createHttpClient>
  sleepCalls: Array<number>
} {
  const config = resolveConfig({
    userConfig: {
      apiKey: 'brew_test_abc',
      baseUrl: 'https://brew.new/api',
      maxRetries: 2,
      ...configOverrides,
    },
  })
  const sleepCalls: Array<number> = []
  const client = createHttpClient(config, {
    retryBaseMs: 1,
    retryMaxMs: 1,
    random: () => 0,
    sleep: (ms: number): Promise<void> => {
      sleepCalls.push(ms)
      return Promise.resolve()
    },
    ...tuningOverrides,
  })
  return { client, sleepCalls }
}
