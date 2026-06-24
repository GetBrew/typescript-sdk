import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Audience } from './types'

export type GetAudienceInput = {
  /**
   * The id of the saved audience to fetch. Must belong to the brand the
   * API key is scoped to; cross-brand or unknown ids surface as
   * `404 AUDIENCE_NOT_FOUND`.
   */
  readonly audienceId: string
  /**
   * Optional sub-resources to embed. Pass `'count'` (or `['count']`) to
   * have the row's `count` field carry the **authoritative**, freshly
   * computed live member total — the size a campaign send would target.
   * Omit it and `count` reflects the cached value, which reads `0` until a
   * cache writer populates it. Accepts an array or a comma string; the SDK
   * serializes it as the single comma-separated `?include=` value.
   */
  readonly include?: ReadonlyArray<'count'> | string
}

/** A single fetched audience row. */
export type GetAudienceResponse = Audience

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetAudienceInput['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/audiences/{audienceId}` — return a single audience row (or
 * `404 AUDIENCE_NOT_FOUND`). Requires the `audiences` scope.
 *
 * Pass `include: 'count'` to make the returned `count` the authoritative
 * live member total instead of the cached value.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetAudienceResponse>` instead of the unwrapped row.
 */
export function createGetAudience(client: HttpClient) {
  function getAudience(
    input: GetAudienceInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAudienceResponse>>
  function getAudience(
    input: GetAudienceInput,
    options?: RequestOptions
  ): Promise<GetAudienceResponse>
  async function getAudience(
    input: GetAudienceInput,
    options?: RequestOptions
  ): Promise<GetAudienceResponse | BrewRawResponse<GetAudienceResponse>> {
    const response = await client.request<GetAudienceResponse>({
      method: 'GET',
      path: `/v1/audiences/${encodeURIComponent(input.audienceId)}`,
      query: { include: serializeInclude(input.include) },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAudience
}
