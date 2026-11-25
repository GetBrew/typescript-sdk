import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Audience } from './types'

export const AUDIENCES_INCLUDE_TOKENS = ['count', 'build'] as const
export type AudiencesIncludeToken = (typeof AUDIENCES_INCLUDE_TOKENS)[number]

export type GetAudienceOptions = RequestOptions & {
  readonly include?: ReadonlyArray<AudiencesIncludeToken> | string
}

export type GetAudienceResponse = Audience

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
    const include = serializeInclude({ include: options?.include })
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
