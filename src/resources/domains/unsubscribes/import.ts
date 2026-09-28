import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  DomainUnsubscribesImportResult,
  ImportDomainUnsubscribesBody,
} from './types'

/**
 * Body of `POST /v1/domains/{domainId}/unsubscribes/import` — the `csv`
 * file text and an optional `column` header — plus the `domainId` that
 * goes on the URL.
 */
export type ImportDomainUnsubscribesInput = {
  /** A MARKETING sending domain; a transactional one owns no list. */
  readonly domainId: string
} & ImportDomainUnsubscribesBody

/**
 * `summary` counts (`rows`, `added`, `alreadyUnsubscribed`, `created`,
 * `skipped`), a `skippedSample`, `truncated`, and the `column` read.
 */
export type ImportDomainUnsubscribesResponse = DomainUnsubscribesImportResult

/**
 * `POST /v1/domains/{domainId}/unsubscribes/import` (scope: `domains`) —
 * migrate an unsubscribe list (another ESP's export) into THIS marketing
 * domain's list.
 *
 * `csv` is the file text: an `email` header, any column of addresses, or
 * one headerless column. Pass `column` to name the header when detection
 * fails (`400` otherwise). Synchronous and bounded: 10,000 rows per call
 * (`truncated: true` when the file carried more — split it across calls)
 * and 2,000,000 characters (a longer `csv` is `400 INVALID_REQUEST`).
 * Idempotent per address. An address with no contact row is created
 * already globally unsubscribed, exactly as `add` does.
 *
 * The contact CSV importer's `subscribed` column is the BRAND-WIDE flag;
 * use this method for per-domain opt-outs. Supply
 * `options.idempotencyKey` to make retries safe; one is generated
 * automatically otherwise.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ImportDomainUnsubscribesResponse>` instead of the
 * unwrapped payload.
 */
export function createImportDomainUnsubscribes(client: HttpClient) {
  function importDomainUnsubscribes(
    input: ImportDomainUnsubscribesInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ImportDomainUnsubscribesResponse>>
  function importDomainUnsubscribes(
    input: ImportDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<ImportDomainUnsubscribesResponse>
  async function importDomainUnsubscribes(
    input: ImportDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<
    | ImportDomainUnsubscribesResponse
    | BrewRawResponse<ImportDomainUnsubscribesResponse>
  > {
    const { domainId, ...body } = input
    const response = await client.request<ImportDomainUnsubscribesResponse>({
      method: 'POST',
      path: `/v1/domains/${encodeURIComponent(domainId)}/unsubscribes/import`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importDomainUnsubscribes
}
