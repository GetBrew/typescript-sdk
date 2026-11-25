import type {
  BrewClientConfig,
  BrewFetch,
  ResolvedBrewClientConfig,
} from '../types'
import { SDK_NAME, SDK_VERSION } from '../version'

export function assertTimeoutMs({
  value,
  name,
}: {
  readonly value: unknown
  readonly name: string
}): void {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new TypeError(
      `\`${name}\` must be a number of milliseconds >= 0 (Infinity for no deadline); got ${String(value)}.`
    )
  }
}

export function assertRetryCount({
  value,
  name,
}: {
  readonly value: unknown
  readonly name: string
}): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new TypeError(
      `\`${name}\` must be a whole number >= 0; got ${String(value)}.`
    )
  }
}

export const DEFAULT_BASE_URL = 'https://brew.new/api'

export const DEFAULT_TIMEOUT_MS = 30_000

export const DEFAULT_MAX_RETRIES = 2

export const shouldRetryOnTimeoutByDefault = true

export const DEFAULT_USER_AGENT = `${SDK_NAME}/${SDK_VERSION}`

export type ResolveConfigInput = {
  readonly userConfig: BrewClientConfig
}

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

  if (
    userConfig.brandId !== undefined &&
    (typeof userConfig.brandId !== 'string' || userConfig.brandId.trim() === '')
  ) {
    throw new TypeError(
      'resolveConfig: `brandId` must be a non-empty string when provided'
    )
  }

  if (userConfig.timeoutMs !== undefined) {
    assertTimeoutMs({ value: userConfig.timeoutMs, name: 'timeoutMs' })
  }
  if (userConfig.maxRetries !== undefined) {
    assertRetryCount({ value: userConfig.maxRetries, name: 'maxRetries' })
  }

  return {
    apiKey: userConfig.apiKey,
    brandId: userConfig.brandId,
    baseUrl: userConfig.baseUrl ?? DEFAULT_BASE_URL,
    fetch: userConfig.fetch ?? defaultFetch,
    timeoutMs: userConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: userConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryOnTimeout: userConfig.retryOnTimeout ?? shouldRetryOnTimeoutByDefault,
    signal: userConfig.signal,
    userAgent: userConfig.userAgent ?? DEFAULT_USER_AGENT,
  }
}

const defaultFetch: BrewFetch = (input, init) => globalThis.fetch(input, init)
