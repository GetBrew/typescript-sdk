import type { components } from '../../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

export type ImportDomainUnsubscribesInput = {
  readonly domainId: string
} & components['schemas']['DomainUnsubscribesImportRequest']

export type ImportDomainUnsubscribesResponse =
  components['schemas']['DomainUnsubscribesImportResponse']

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
    const response = await client.request<ImportDomainUnsubscribesResponse>({
      method: 'POST',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/unsubscribes/import`,
      body: {
        csv: input.csv,
        ...(input.column === undefined ? {} : { column: input.column }),
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importDomainUnsubscribes
}
