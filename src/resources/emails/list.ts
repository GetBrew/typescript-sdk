import type { components, operations } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'

export type ListEmailsInput = operations['listEmails']['parameters']['query']
export type ListEmailsResponse = components['schemas']['EmailsListResponse']

/**
 * List latest logical emails for the current organization.
 *
 * Filters map directly to the public API query params so SDK callers can
 * stay close to the wire contract when debugging request logs.
 */
export function createListEmails(client: HttpClient) {
  return async (input: ListEmailsInput = {}): Promise<ListEmailsResponse> => {
    const response = await client.request<ListEmailsResponse>({
      method: 'GET',
      path: '/v1/emails',
      query: input,
    })
    return response.data
  }
}
