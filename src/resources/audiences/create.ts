import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AudienceWriteResult } from './types'

export type CreateAudienceInput = components['schemas']['AudiencesPostRequest']

export type CreateAudienceResponse = AudienceWriteResult

export function createCreateAudience(client: HttpClient) {
  function createAudience(
    input: CreateAudienceInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateAudienceResponse>>
  function createAudience(
    input: CreateAudienceInput,
    options?: RequestOptions
  ): Promise<CreateAudienceResponse>
  async function createAudience(
    input: CreateAudienceInput,
    options?: RequestOptions
  ): Promise<CreateAudienceResponse | BrewRawResponse<CreateAudienceResponse>> {
    const response = await client.request<CreateAudienceResponse>({
      method: 'POST',
      path: '/v1/audiences',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createAudience
}
