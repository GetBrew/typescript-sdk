import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentGifRequest, ContentGifResponse } from './types'

export type { ContentGifRequest, ContentGifResponse }

export const GIF_DEFAULT_TIMEOUT_MS = 300_000

export function createGif(client: HttpClient) {
  function gif(
    input: ContentGifRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentGifResponse>>
  function gif(
    input: ContentGifRequest,
    options?: RequestOptions
  ): Promise<ContentGifResponse>
  async function gif(
    input: ContentGifRequest,
    options?: RequestOptions
  ): Promise<ContentGifResponse | BrewRawResponse<ContentGifResponse>> {
    const response = await client.request<ContentGifResponse>({
      method: 'POST',
      path: '/v1/content/gif',
      body: input,
      defaultTimeoutMs: GIF_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return gif
}
