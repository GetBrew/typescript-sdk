import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GetAudienceCountInput = {
  /**
   * The id of the saved audience to count. The audience must belong to
   * the brand the API key is scoped to. Cross-brand or unknown ids
   * surface as `404 AUDIENCE_NOT_FOUND` from the server.
   */
  readonly audienceId: string
}

/** The `{ audienceId, count }` envelope returned by `GET /v1/audiences/{audienceId}/count`. */
export type AudienceCountResponse =
  components['schemas']['AudienceCountResponse']

/**
 * `GET /v1/audiences/{audienceId}/count` — return an authoritative,
 * freshly-computed member count over the audience's saved filters: the
 * size a campaign send would target. Requires the `audiences` scope.
 *
 * Prefer this over the cached `count` field on the audience row, which
 * reads `0` until a cache writer populates it.
 *
 * Returns `{ audienceId, count }`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<AudienceCountResponse>` instead of the unwrapped
 * payload.
 */
export function createGetAudienceCount(client: HttpClient) {
  function getAudienceCount(
    input: GetAudienceCountInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AudienceCountResponse>>
  function getAudienceCount(
    input: GetAudienceCountInput,
    options?: RequestOptions
  ): Promise<AudienceCountResponse>
  async function getAudienceCount(
    input: GetAudienceCountInput,
    options?: RequestOptions
  ): Promise<AudienceCountResponse | BrewRawResponse<AudienceCountResponse>> {
    const response = await client.request<AudienceCountResponse>({
      method: 'GET',
      path: `/v1/audiences/${encodeURIComponent(input.audienceId)}/count`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAudienceCount
}
