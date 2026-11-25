import { resolveConfig } from '../../src/core/config'
import { createHttpClient, type HttpTuning } from '../../src/core/http'
import type { BrewClientConfig } from '../../src/types'

export function makeTestHttpClient({
  configOverrides = {},
  tuningOverrides = {},
  useRealSleep = false,
}: {
  configOverrides?: Partial<BrewClientConfig>
  tuningOverrides?: HttpTuning
  useRealSleep?: boolean
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
  const recordingSleep = ({ ms }: { ms: number }): Promise<void> => {
    sleepCalls.push(ms)
    return Promise.resolve()
  }
  const client = createHttpClient(config, {
    retryBaseMs: 1,
    retryMaxMs: 1,
    random: () => 0,
    ...(useRealSleep ? {} : { sleep: recordingSleep }),
    ...tuningOverrides,
  })
  return { client, sleepCalls }
}
