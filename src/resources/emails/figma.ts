import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type ImportFigmaDesignInput =
  components['schemas']['FigmaToEmailRequest']

export type ImportFigmaDesignResponse =
  components['schemas']['FigmaToEmailResponse']

export const IMPORT_FIGMA_DEFAULT_TIMEOUT_MS = 800_000

export function createImportFigmaDesign(client: HttpClient) {
  function importFigmaDesign(
    input: ImportFigmaDesignInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ImportFigmaDesignResponse>>
  function importFigmaDesign(
    input: ImportFigmaDesignInput,
    options?: RequestOptions
  ): Promise<ImportFigmaDesignResponse>
  async function importFigmaDesign(
    input: ImportFigmaDesignInput,
    options?: RequestOptions
  ): Promise<
    ImportFigmaDesignResponse | BrewRawResponse<ImportFigmaDesignResponse>
  > {
    const response = await client.request<ImportFigmaDesignResponse>({
      method: 'POST',
      path: '/v1/emails/figma',
      body: input,
      defaultTimeoutMs: IMPORT_FIGMA_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importFigmaDesign
}
