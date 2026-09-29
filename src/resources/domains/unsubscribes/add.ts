import type { components } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/** Input to `brew.domains.unsubscribes.add(...)`: 1 to 1,000 addresses. */
export type AddDomainUnsubscribesInput = {
  readonly domainId: string
} & components['schemas']['DomainUnsubscribesAddRequest']

export type AddDomainUnsubscribesResponse =
  components['schemas']['DomainUnsubscribesAddResponse']

/**
 * `POST /v1/domains/{domainId}/unsubscribes` (scope: `domains`) — suppress
 * up to 1,000 addresses from THIS marketing domain's mail. A known contact
 * is suppressed for this domain only; an address with no contact is created
 * already unsubscribed brand-wide. Addresses already on the list count as
 * `alreadyUnsubscribed`, and malformed ones come back in `invalid`.
 * Idempotent: pass `options.idempotencyKey` to retry safely.
 */
export function createAddDomainUnsubscribes(client: HttpClient) {
  function addDomainUnsubscribes(
    input: AddDomainUnsubscribesInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AddDomainUnsubscribesResponse>>
  function addDomainUnsubscribes(
    input: AddDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<AddDomainUnsubscribesResponse>
  async function addDomainUnsubscribes(
    input: AddDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<
    | AddDomainUnsubscribesResponse
    | BrewRawResponse<AddDomainUnsubscribesResponse>
  > {
    const response = await client.request<AddDomainUnsubscribesResponse>({
      method: 'POST',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/unsubscribes`,
      body: { emails: input.emails },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return addDomainUnsubscribes
}
