import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListAudiencesResponse } from './list'
import type { Audience } from './types'

/** Create body — a name + a filter set over the brand's contacts. */
export type CreateAudienceInput = {
  name: string
  filters: Audience['filters']
}

/** Duplicate body — clones an existing audience (name suffixed " (copy)"). */
export type DuplicateAudienceInput = {
  duplicateFrom: string
}

/** Both create + duplicate return the uniform `{ audiences: [row] }`. */
export type CreateAudienceResponse = ListAudiencesResponse

/**
 * `POST /v1/audiences` — create a saved audience from a filter set.
 * Returns the uniform `{ audiences: [row] }` envelope.
 */
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

/**
 * `POST /v1/audiences { duplicateFrom }` — clone an existing audience.
 */
export function createDuplicateAudience(client: HttpClient) {
  function duplicateAudience(
    input: DuplicateAudienceInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateAudienceResponse>>
  function duplicateAudience(
    input: DuplicateAudienceInput,
    options?: RequestOptions
  ): Promise<CreateAudienceResponse>
  async function duplicateAudience(
    input: DuplicateAudienceInput,
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
  return duplicateAudience
}
