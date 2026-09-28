import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { DomainUnsubscribeRemoveResult } from './types'

/**
 * `{ domainId, domainHost, email, removed, globallyUnsubscribed }` —
 * `removed: false` when the address was not on the list.
 */
export type RemoveDomainUnsubscribeResponse = DomainUnsubscribeRemoveResult

/**
 * `DELETE /v1/domains/{domainId}/unsubscribes/{email}` (scope:
 * `domains`) — take ONE address off THIS domain's list, resubscribing it
 * to this host only. Idempotent: `removed: false` when the address was
 * not on the list. The address is URL-encoded for you.
 *
 * It never clears the brand-wide opt-out: `globallyUnsubscribed: true`
 * means every marketing send still skips the contact until
 * `PATCH /v1/contacts/{email}` sets `subscribed: true`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<RemoveDomainUnsubscribeResponse>` instead of the
 * unwrapped payload.
 */
export function createRemoveDomainUnsubscribe(client: HttpClient) {
  function removeDomainUnsubscribe(
    domainId: string,
    email: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<RemoveDomainUnsubscribeResponse>>
  function removeDomainUnsubscribe(
    domainId: string,
    email: string,
    options?: RequestOptions
  ): Promise<RemoveDomainUnsubscribeResponse>
  async function removeDomainUnsubscribe(
    domainId: string,
    email: string,
    options?: RequestOptions
  ): Promise<
    | RemoveDomainUnsubscribeResponse
    | BrewRawResponse<RemoveDomainUnsubscribeResponse>
  > {
    const response = await client.request<RemoveDomainUnsubscribeResponse>({
      method: 'DELETE',
      path: `/v1/domains/${encodeURIComponent(domainId)}/unsubscribes/${encodeURIComponent(email)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return removeDomainUnsubscribe
}
