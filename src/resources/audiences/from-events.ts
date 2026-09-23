import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

type GeneratedFromEventsRequest =
  components['schemas']['AudiencesFromEventsRequest']
type GeneratedCohort = GeneratedFromEventsRequest['cohort']

/**
 * The cohort the API accepts: a window start (`from`) OR a `sendId` (then
 * the window defaults to the hour before that send was dispatched). The
 * generated type marks both optional because OpenAPI cannot say "one of",
 * so this union makes the neither-shape a compile error instead of a 400.
 */
export type AudienceFromEventsCohort =
  | (GeneratedCohort & { readonly from: string })
  | (GeneratedCohort & { readonly sendId: string })

export type AudienceFromEventsInput = Omit<
  GeneratedFromEventsRequest,
  'cohort'
> & {
  readonly cohort: AudienceFromEventsCohort
}
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
    options?: RequestOptions
  ): Promise<AudienceFromEventsResponse>
  async function fromEvents(
    input: AudienceFromEventsInput,
    options?: RequestOptions
  ): Promise<
    AudienceFromEventsResponse | BrewRawResponse<AudienceFromEventsResponse>
  > {
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
