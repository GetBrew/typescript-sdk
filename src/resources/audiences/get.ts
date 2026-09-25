import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Audience } from './types'

/** The expansions `GET /v1/audiences/{audienceId}` accepts. */
export const AUDIENCES_INCLUDE_TOKENS = ['count', 'build'] as const
export type AudiencesIncludeToken = (typeof AUDIENCES_INCLUDE_TOKENS)[number]

/**
 * Per-request options for `brew.audiences.get(...)` — the standard
 * `RequestOptions` plus the detail-only `include` expansion.
 */
export type GetAudienceOptions = RequestOptions & {
  /**
   * `'count'` makes the row's `count` the authoritative, freshly
   * computed live member total — the size a campaign send would target —
   * instead of the cached value. `'build'` attaches `build`, the latest
   * cohort build of an audience made by `brew.audiences.fromEvents(...)`.
   * Accepts an array of tokens or a comma string.
   */
  readonly include?: ReadonlyArray<AudiencesIncludeToken> | string
}

/** `GET /v1/audiences/{audienceId}` returns the BARE `Audience` row. */
export type GetAudienceResponse = Audience

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetAudienceOptions['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/audiences/{audienceId}` (scope: `audiences`) — one saved
 * audience, returned as the BARE row. Pass `include: 'count'` to make
 * `count` the authoritative live member total instead of the cached
 * value, and `'build'` to attach the latest cohort build.
 *
 * An unknown or cross-brand id is `404 AUDIENCE_NOT_FOUND` — it is no
 * longer an empty page you have to test for.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetAudienceResponse>` instead of the unwrapped row.
 */
export function createGetAudience(client: HttpClient) {
  function getAudience(
    audienceId: string,
    options: GetAudienceOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAudienceResponse>>
  function getAudience(
    audienceId: string,
    options?: GetAudienceOptions
  ): Promise<GetAudienceResponse>
  async function getAudience(
    audienceId: string,
    options?: GetAudienceOptions
  ): Promise<GetAudienceResponse | BrewRawResponse<GetAudienceResponse>> {
    const include = serializeInclude(options?.include)
    const response = await client.request<GetAudienceResponse>({
      method: 'GET',
      path: `/v1/audiences/${encodeURIComponent(audienceId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAudience
}
