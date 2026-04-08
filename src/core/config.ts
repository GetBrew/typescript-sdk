import type {
  BrewClientConfig,
  BrewFetch,
  ResolvedBrewClientConfig,
} from '../types'

/**
 * Production base URL for the Brew public API. Exposed as a constant so
 * tests and downstream consumers can reference the same value without
 * hardcoding strings.
 */
export const DEFAULT_BASE_URL = 'https://brew.new/api'

/**
 * Default per-request timeout. Long enough to cover legitimate batch
 * operations but short enough that a hung request surfaces as a client
 * error well inside typical caller SLAs.
 */
export const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Default retry cap. Two retries on top of the initial attempt means a
 * given request will make at most three HTTP attempts before giving up —
 * enough to absorb a single transient upstream hiccup plus one more for
 * safety, without amplifying thundering-herd pressure.
 */
export const DEFAULT_MAX_RETRIES = 2

/**
 * Default `User-Agent` value. Identifies the SDK and its version so
 * incoming requests are attributable in server logs.
 */
export const DEFAULT_USER_AGENT = 'brew-typescript-sdk/0.0.0'

export type ResolveConfigInput = {
  readonly userConfig: BrewClientConfig
}

/**
 * Merge the caller's `BrewClientConfig` with our defaults and return a
 * fully-resolved config object. Every internal code path should consume
 * this, never the raw user config, so defaults are always honored and
 * callers never have to remember which fields are optional.
 *
 * Validates `apiKey` at the boundary: empty or whitespace-only keys throw
 * a `TypeError` immediately rather than failing later with a confusing
 * 401 from the server.
 */
export function resolveConfig(
  input: ResolveConfigInput
): ResolvedBrewClientConfig {
  const { userConfig } = input

  if (typeof userConfig.apiKey !== 'string' || userConfig.apiKey.trim() === '') {
    throw new TypeError(
      'resolveConfig: `apiKey` is required and must be a non-empty string'
    )
  }

  return {
    apiKey: userConfig.apiKey,
    baseUrl: userConfig.baseUrl ?? DEFAULT_BASE_URL,
    fetch: userConfig.fetch ?? defaultFetch,
    timeoutMs: userConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: userConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    userAgent: userConfig.userAgent ?? DEFAULT_USER_AGENT,
  }
}

/**
 * Default fetch implementation: the global `fetch` bound to `globalThis`.
 * Binding matters — some runtimes throw "Illegal invocation" if `fetch` is
 * called with the wrong `this`, and we want the same reference reused
 * across requests so custom transports (like a signed-proxy fetch) can
 * still be injected via `BrewClientConfig.fetch`.
 */
const defaultFetch: BrewFetch = globalThis.fetch.bind(globalThis)
