import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type EmailImportInput = components['schemas']['EmailImportRequest']

export type EmailImportResponse = components['schemas']['EmailImportResponse']

export const IMPORT_EMAIL_DEFAULT_TIMEOUT_MS = 300_000

export function createImportEmail(client: HttpClient) {
  function importEmail(
    input: EmailImportInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailImportResponse>>
  function importEmail(
    input: EmailImportInput,
    options?: RequestOptions
  ): Promise<EmailImportResponse>
  async function importEmail(
    input: EmailImportInput,
    options?: RequestOptions
  ): Promise<EmailImportResponse | BrewRawResponse<EmailImportResponse>> {
    const response = await client.request<EmailImportResponse>({
      method: 'POST',
      path: '/v1/emails/import',
      body: input,
      defaultTimeoutMs: IMPORT_EMAIL_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importEmail
}
