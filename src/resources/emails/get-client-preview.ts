import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type GetEmailClientPreviewResponse =
  operations['getEmailRendering']['responses'][200]['content']['application/json']

export function createGetEmailClientPreview(client: HttpClient) {
  function getClientPreview(
    previewId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetEmailClientPreviewResponse>>
  function getClientPreview(
    previewId: string,
    options?: RequestOptions
  ): Promise<GetEmailClientPreviewResponse>
  async function getClientPreview(
    previewId: string,
    options?: RequestOptions
  ): Promise<
    | GetEmailClientPreviewResponse
    | BrewRawResponse<GetEmailClientPreviewResponse>
  > {
    const response = await client.request<GetEmailClientPreviewResponse>({
      method: 'GET',
      path: `/v1/emails/client-previews/${encodeURIComponent(previewId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getClientPreview
}
