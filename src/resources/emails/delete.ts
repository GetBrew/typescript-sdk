import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type DeleteEmailInput = {
  /**
   * The id of the email design to delete. Resolved against the brand
   * the API key is scoped to — unknown or cross-brand ids are not an
   * error, they resolve idempotently with `{ deleted: false }`.
   */
  emailId: string
}
export type DeleteEmailResponse = components['schemas']['EmailsDeleteResponse']

/**
 * `DELETE /v1/emails/{emailId}` (scope: `emails`) — hard-delete every
 * version of an email + its grouping rows. Idempotent: an unknown or
 * cross-brand id resolves `200 { emailId, deleted: false }` instead of
 * a 404.
 */
export function createDeleteEmail(client: HttpClient) {
  function deleteEmail(
    input: DeleteEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<DeleteEmailResponse>>
  function deleteEmail(
    input: DeleteEmailInput,
    options?: RequestOptions
  ): Promise<DeleteEmailResponse>
  async function deleteEmail(
    input: DeleteEmailInput,
    options?: RequestOptions
  ): Promise<DeleteEmailResponse | BrewRawResponse<DeleteEmailResponse>> {
    const response = await client.request<DeleteEmailResponse>({
      method: 'DELETE',
      path: `/v1/emails/${encodeURIComponent(input.emailId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteEmail
}
