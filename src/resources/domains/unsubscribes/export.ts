import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  DomainUnsubscribesExport,
  ExportDomainUnsubscribesQuery,
} from './types'

/** The marketing domain whose list you are exporting, plus `scope`. */
export type ExportDomainUnsubscribesInput = {
  /** A MARKETING sending domain; a transactional one owns no list. */
  readonly domainId: string
} & ExportDomainUnsubscribesQuery

/**
 * `{ domainId, domainHost, csv, rowCount, truncated }` — the list as CSV
 * text (`Email,Scope,Unsubscribed At,Source,Send ID`) inside the JSON
 * envelope.
 */
export type ExportDomainUnsubscribesResponse = DomainUnsubscribesExport

/**
 * `GET /v1/domains/{domainId}/unsubscribes/export` (scope: `domains`) —
 * the whole list as CSV text inside the JSON envelope (the v1 transport
 * is JSON-only), with columns `Email,Scope,Unsubscribed At,Source,Send ID`.
 *
 * Capped at 50,000 rows or about 4 MB of CSV, whichever comes first, so
 * the response stays under the platform body limit: `truncated: true`
 * beyond that, and `scope` (`domain` | `all` | `any`, the default)
 * narrows it.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ExportDomainUnsubscribesResponse>` instead of the
 * unwrapped payload.
 */
export function createExportDomainUnsubscribes(client: HttpClient) {
  function exportDomainUnsubscribes(
    input: ExportDomainUnsubscribesInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ExportDomainUnsubscribesResponse>>
  function exportDomainUnsubscribes(
    input: ExportDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<ExportDomainUnsubscribesResponse>
  async function exportDomainUnsubscribes(
    input: ExportDomainUnsubscribesInput,
    options?: RequestOptions
  ): Promise<
    | ExportDomainUnsubscribesResponse
    | BrewRawResponse<ExportDomainUnsubscribesResponse>
  > {
    const { domainId, scope } = input
    const response = await client.request<ExportDomainUnsubscribesResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(domainId)}/unsubscribes/export`,
      query: { scope },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return exportDomainUnsubscribes
}
