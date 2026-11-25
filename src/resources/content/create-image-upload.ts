import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentImageUploadCreateRequest,
  ContentImageUploadCreateResponse,
} from './types'

export type {
  ContentImageUploadCreateRequest,
  ContentImageUploadCreateResponse,
}

export function createCreateImageUpload(client: HttpClient) {
  function createImageUpload(
    input: ContentImageUploadCreateRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentImageUploadCreateResponse>>
  function createImageUpload(
    input: ContentImageUploadCreateRequest,
    options?: RequestOptions
  ): Promise<ContentImageUploadCreateResponse>
  async function createImageUpload(
    input: ContentImageUploadCreateRequest,
    options?: RequestOptions
  ): Promise<
    | ContentImageUploadCreateResponse
    | BrewRawResponse<ContentImageUploadCreateResponse>
  > {
    const response = await client.request<ContentImageUploadCreateResponse>({
      method: 'POST',
      path: '/v1/content/image-uploads',
      body: input,
      idempotency: 'none',
      defaultMaxRetries: 0,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createImageUpload
}
