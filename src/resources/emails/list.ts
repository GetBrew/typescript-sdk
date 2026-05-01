import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ListEmailsInput = operations['listEmails']['parameters']['query']
export type ListEmailsResponse = components['schemas']['EmailsListResponse']

/**
 * List latest logical emails for the current organization.
 *
 * Filters map directly to the public API query params so SDK callers can
 * stay close to the wire contract when debugging request logs.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListEmailsResponse>` instead of the unwrapped
 * envelope.
 */
export function createListEmails(client: HttpClient) {
  function listEmails(
    input: ListEmailsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListEmailsResponse>>
  function listEmails(
    input?: ListEmailsInput,
    options?: RequestOptions
  ): Promise<ListEmailsResponse>
  async function listEmails(
    input: ListEmailsInput = {},
    options?: RequestOptions
  ): Promise<ListEmailsResponse | BrewRawResponse<ListEmailsResponse>> {
    const response = await client.request<ListEmailsResponse>({
      method: 'GET',
      path: '/v1/emails',
      query: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listEmails
}
