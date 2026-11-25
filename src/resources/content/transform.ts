import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContentTransformRequest, ContentTransformResponse } from './types'

export type { ContentTransformRequest, ContentTransformResponse }

export function createTransform(client: HttpClient) {
  function transform(
    input: ContentTransformRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentTransformResponse>>
  function transform(
    input: ContentTransformRequest,
    options?: RequestOptions
  ): Promise<ContentTransformResponse>
  async function transform(
    input: ContentTransformRequest,
    options?: RequestOptions
  ): Promise<
    ContentTransformResponse | BrewRawResponse<ContentTransformResponse>
  > {
    const response = await client.request<ContentTransformResponse>({
      method: 'POST',
      path: '/v1/content/transform',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return transform
}
