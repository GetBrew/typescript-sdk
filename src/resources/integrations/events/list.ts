import { type HttpClient, unwrapResponse } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  IntegrationEventsListResponse,
  ListIntegrationEventsQuery,
} from './types'

export type ListIntegrationEventsInput = Readonly<ListIntegrationEventsQuery>

export type ListIntegrationEventsResponse = IntegrationEventsListResponse

export function createListIntegrationEvents(client: HttpClient) {
  function listIntegrationEvents(
    input: ListIntegrationEventsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListIntegrationEventsResponse>>
  function listIntegrationEvents(
    input?: ListIntegrationEventsInput,
    options?: RequestOptions
  ): Promise<ListIntegrationEventsResponse>
  async function listIntegrationEvents(
    input: ListIntegrationEventsInput = {},
    options?: RequestOptions
  ): Promise<
    | ListIntegrationEventsResponse
    | BrewRawResponse<ListIntegrationEventsResponse>
  > {
    const response = await client.request<ListIntegrationEventsResponse>({
      method: 'GET',
      path: '/v1/integrations/events',
      query: {
        provider: input.provider,
        query: input.query,
        kind: input.kind,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listIntegrationEvents
}
