import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandImagesResponse, ListBrandImagesInput } from './types'

export type { BrandImagesResponse, ListBrandImagesInput }

/**
 * `GET /v1/brand/images` — the brand's saved image library (harvested +
 * generated), each with a description and dimensions. Requires the
 * `emails` scope.
 *
 * Two modes on the same read:
 * - Browse (default): every image, newest first, paginated via `limit` +
 *   `cursor`. Pass `pagination.cursor` back as `cursor` to fetch the
 *   next page while `pagination.hasMore` is `true`.
 * - Semantic search: pass `q` to rank images by meaning (a vector search
 *   over their descriptions) instead of browsing chronologically.
 *
 * Narrow either mode with `type` (e.g. an image category) and
 * `aspectRatio` (e.g. `'16:9'`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<BrandImagesResponse>` instead of the unwrapped
 * envelope.
 */
export function createGetBrandImages(client: HttpClient) {
  function getImages(
    input: ListBrandImagesInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<BrandImagesResponse>>
  function getImages(
    input?: ListBrandImagesInput,
    options?: RequestOptions
  ): Promise<BrandImagesResponse>
  async function getImages(
    input: ListBrandImagesInput = {},
    options?: RequestOptions
  ): Promise<BrandImagesResponse | BrewRawResponse<BrandImagesResponse>> {
    const response = await client.request<BrandImagesResponse>({
      method: 'GET',
      path: '/v1/brand/images',
      query: {
        q: input.q,
        type: input.type,
        aspectRatio: input.aspectRatio,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getImages
}
