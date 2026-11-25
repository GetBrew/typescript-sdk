import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ImportEmailImageInput = components['schemas']['ImageToEmailRequest']

export type ImportEmailImageResponse =
  components['schemas']['ImageToEmailResponse']

export const IMPORT_IMAGE_DEFAULT_TIMEOUT_MS = 800_000

export function createImportEmailImage(client: HttpClient) {
  function importEmailImage(
    input: ImportEmailImageInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ImportEmailImageResponse>>
  function importEmailImage(
    input: ImportEmailImageInput,
    options?: RequestOptions
  ): Promise<ImportEmailImageResponse>
  async function importEmailImage(
    input: ImportEmailImageInput,
    options?: RequestOptions
  ): Promise<
    ImportEmailImageResponse | BrewRawResponse<ImportEmailImageResponse>
  > {
    const response = await client.request<ImportEmailImageResponse>({
      method: 'POST',
      path: '/v1/emails/image',
      body: input,
      defaultTimeoutMs: IMPORT_IMAGE_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importEmailImage
}
