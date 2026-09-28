import type { components, operations } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

/** Input to `brew.domains.unsubscribes.export(...)`. */
export type ExportDomainUnsubscribesInput = {
  readonly domainId: string
} & NonNullable<operations['exportDomainUnsubscribes']['parameters']['query']>

export type ExportDomainUnsubscribesResponse =
  components['schemas']['DomainUnsubscribesExportResponse']

/**
 * `GET /v1/domains/{domainId}/unsubscribes/export` (scope: `domains`) — the
 * list as CSV text in one response (`csv`, `rowCount`), narrowed by `scope`
 * like `list`; `truncated: true` when the export hit its row cap.
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
    const response = await client.request<ExportDomainUnsubscribesResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/unsubscribes/export`,
      query: { scope: input.scope },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return exportDomainUnsubscribes
}
