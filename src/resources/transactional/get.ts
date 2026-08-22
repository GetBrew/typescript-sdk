import { type HttpClient, unwrapResponse } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { TransactionalEmail } from './types'

export type { TransactionalEmail }

/**
 * `GET /v1/transactional/{transactionId}` — read a reusable transactional
 * email object (scope: `sends`).
 *
 * Returns the locked configuration (design pin, domain, envelope,
 * `strictTemplating`) plus, on Liquid-enabled workspaces, the template's
 * data contract:
 * - `variableTree` — every variable path the pinned template references
 *   (`trigger.*` from your payload, `customer.*` from the contact), with
 *   array/object shape and declared fallbacks.
 * - `examplePayload` — a payload that satisfies the template, nested
 *   arrays/objects included. Fire it verbatim with
 *   `emails.send({ transactionId, to, payload: examplePayload })`.
 * - `templating` — the workspace's engine (`legacy` | `liquid`).
 *
 * Use this before building a `payload` so the shape comes from the
 * template rather than guesswork; the tree is recomputed from the pinned
 * design on every read.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<TransactionalEmail>` instead of the unwrapped payload.
 */
export function createGetTransactionalEmail(client: HttpClient) {
  function getTransactionalEmail(
    transactionId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<TransactionalEmail>>
  function getTransactionalEmail(
    transactionId: string,
    options?: RequestOptions
  ): Promise<TransactionalEmail>
  async function getTransactionalEmail(
    transactionId: string,
    options?: RequestOptions
  ): Promise<TransactionalEmail | BrewRawResponse<TransactionalEmail>> {
    const response = await client.request<TransactionalEmail>({
      method: 'GET',
      path: `/v1/transactional/${encodeURIComponent(transactionId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getTransactionalEmail
}
