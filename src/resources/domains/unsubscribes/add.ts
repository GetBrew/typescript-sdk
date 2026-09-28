import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  AddDomainUnsubscribesBody,
  DomainUnsubscribesAddResult,
} from './types'

/**
 * Body of `POST /v1/domains/{domainId}/unsubscribes` (1–1,000 `emails`),
 * plus the `domainId` that goes on the URL.
 */
export type AddDomainUnsubscribesInput = {
  /** A MARKETING sending domain; a transactional one owns no list. */
  readonly domainId: string
} & AddDomainUnsubscribesBody

/**
 * `summary` counts (`received`, `added`, `alreadyUnsubscribed`,
 * `created`, `invalid`) plus the `invalid` addresses that were skipped.
 */
export type AddDomainUnsubscribesResponse = DomainUnsubscribesAddResult

/**
 * `POST /v1/domains/{domainId}/unsubscribes` (scope: `domains`) —
 * suppress up to 1,000 addresses from THIS marketing domain's mail.
 *
 * An existing contact is suppressed for this host only: sends from OTHER
 * marketing domains still reach it (set `subscribed: false` on the
 * contact for a brand-wide opt-out). An address with no contact is
 * created already globally unsubscribed, so every marketing domain skips
 * it (`summary.created`). Addresses already on the list count under
 * `alreadyUnsubscribed` and never error; malformed ones are reported in
 * `invalid` and skipped.
 *
 * A transactional domain owns no list: `422 DOMAIN_PURPOSE_NOT_ALLOWED`.
 * Supply `options.idempotencyKey` to make retries safe; one is generated
 * automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<AddDomainUnsubscribesResponse>` instead of the
 * unwrapped payload.
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
    const { domainId, ...body } = input
    const response = await client.request<AddDomainUnsubscribesResponse>({
      method: 'POST',
      path: `/v1/domains/${encodeURIComponent(domainId)}/unsubscribes`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return addDomainUnsubscribes
}
