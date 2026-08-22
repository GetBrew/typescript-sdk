import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { DeleteEmailGroupInput, EmailGroupDeleteResponse } from './types'

export type { DeleteEmailGroupInput, EmailGroupDeleteResponse }

/**
 * `DELETE /v1/email-groups/{groupId}` (scope: `emails`) — delete a named
 * folder. Member emails move to Ungrouped. Ungrouped cannot be deleted
 * (`400`). Idempotent: an unknown / cross-brand id resolves with
 * `{ groupId, deleted: false }` rather than throwing.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<EmailGroupDeleteResponse>` instead of the unwrapped
 * payload.
 */
export function createDeleteEmailGroup(client: HttpClient) {
  function deleteEmailGroup(
    input: DeleteEmailGroupInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailGroupDeleteResponse>>
  function deleteEmailGroup(
    input: DeleteEmailGroupInput,
    options?: RequestOptions
  ): Promise<EmailGroupDeleteResponse>
  async function deleteEmailGroup(
    input: DeleteEmailGroupInput,
    options?: RequestOptions
  ): Promise<
    EmailGroupDeleteResponse | BrewRawResponse<EmailGroupDeleteResponse>
  > {
    const response = await client.request<EmailGroupDeleteResponse>({
      method: 'DELETE',
      path: `/v1/email-groups/${encodeURIComponent(input.groupId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return deleteEmailGroup
}
