import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewResponse, BrewRawResponse, RequestOptions } from '../../types'

export type AudienceFromEventsInput =
  components['schemas']['AudiencesFromEventsRequest']
export type AudienceFromEventsResponse =
  components['schemas']['AudiencesFromEventsResponse']

/** `POST /v1/audiences/from-events` — create an async event-cohort snapshot. */
export function createAudienceFromEvents(client: HttpClient) {
  function fromEvents(
    input: AudienceFromEventsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AudienceFromEventsResponse>>
  function fromEvents(
    input: AudienceFromEventsInput,
    options?: RequestOptions<false>
  ): Promise<AudienceFromEventsResponse>
  function fromEvents(
    input: AudienceFromEventsInput,
    options?: RequestOptions
  ): Promise<BrewResponse<AudienceFromEventsResponse>>
  async function fromEvents(
    input: AudienceFromEventsInput,
    options?: RequestOptions
  ): Promise<BrewResponse<AudienceFromEventsResponse>> {
    const response = await client.request<AudienceFromEventsResponse>({
      method: 'POST',
      path: '/v1/audiences/from-events',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return fromEvents
}
