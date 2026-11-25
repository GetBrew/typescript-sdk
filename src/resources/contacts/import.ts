import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ImportContactsInput = components['schemas']['ContactsImportRequest']

export type ImportContactsResponse =
  components['schemas']['ContactsImportResponse']

export type ImportContactsSummary = ImportContactsResponse['summary']

export type ImportContactsError = ImportContactsResponse['errors'][number]

export type ImportContactsWarning = ImportContactsResponse['warnings'][number]

export function createImportContacts(client: HttpClient) {
  function importContacts(
    input: ImportContactsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ImportContactsResponse>>
  function importContacts(
    input: ImportContactsInput,
    options?: RequestOptions
  ): Promise<ImportContactsResponse>
  async function importContacts(
    input: ImportContactsInput,
    options?: RequestOptions
  ): Promise<ImportContactsResponse | BrewRawResponse<ImportContactsResponse>> {
    const response = await client.request<ImportContactsResponse>({
      method: 'POST',
      path: '/v1/contacts/import',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importContacts
}
