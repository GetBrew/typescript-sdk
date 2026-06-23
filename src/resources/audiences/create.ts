import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Audience } from './types'

/** Create body — a name + a filter set over the brand's contacts. */
export type CreateAudienceInput = components['schemas']['AudiencesPostRequest']

/** Duplicate input — the id of the audience to clone. */
export type DuplicateAudienceInput = {
  /** The id of the existing audience to duplicate (name suffixed " (copy)"). */
  readonly audienceId: string
}

/** Both create + duplicate return the bare created `Audience` row. */
export type CreateAudienceResponse = Audience

/**
 * `POST /v1/audiences` — create a saved audience from a filter set.
 * Requires the `audiences` scope. Returns the created `Audience` row.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CreateAudienceResponse>` instead of the unwrapped row.
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
 * `POST /v1/audiences/{audienceId}/duplicate` — clone an existing
 * audience. Requires the `audiences` scope. Returns the duplicated
 * `Audience` row.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CreateAudienceResponse>` instead of the unwrapped row.
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
      path: `/v1/audiences/${encodeURIComponent(input.audienceId)}/duplicate`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return duplicateAudience
}
