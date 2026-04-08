import type {
  BrewClientConfig,
  BrewFetch,
  ResolvedBrewClientConfig,
} from '../types'
import { SDK_NAME, SDK_VERSION } from '../version'

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
 * incoming requests are attributable in server logs. Sourced from
 * `src/version.ts` so bumping the version in one place propagates here.
 */
export const DEFAULT_USER_AGENT = `${SDK_NAME}/${SDK_VERSION}`

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

  if (
    typeof userConfig.apiKey !== 'string' ||
    userConfig.apiKey.trim() === ''
  ) {
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
 * Default fetch implementation: a thin closure that resolves
 * `globalThis.fetch` at CALL TIME, not at module-import time.
 *
 * This matters for two reasons:
 *   1. Some runtimes throw "Illegal invocation" if the native fetch is
 *      called with the wrong `this`. Calling it off of `globalThis`
 *      directly avoids the issue without needing `.bind(globalThis)`.
 *   2. Testing tools like MSW v2 replace `globalThis.fetch` inside their
 *      `beforeAll` hook, which runs AFTER this module is imported. If we
 *      captured the reference at import time (e.g. via `.bind`), we would
 *      keep pointing at the ORIGINAL, unpatched fetch forever and MSW
 *      would silently fail to intercept anything the SDK sends.
 *
 * Resolving at call time keeps both use cases correct.
 */
const defaultFetch: BrewFetch = (input, init) => globalThis.fetch(input, init)
