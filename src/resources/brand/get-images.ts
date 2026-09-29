import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandImagesResponse, ListBrandImagesInput } from './types'

export type { BrandImagesResponse, ListBrandImagesInput }

/**
 * `GET /v1/brand/images` — the brand's asset library as the Assets page
 * shows it: logos, brand images (from the site or uploaded, including the
 * social preview and site screenshot) and images made with Brew. Each row
 * carries its `assetId`, `kind`, `addedAt` and dimensions. Requires the
 * `emails` scope.
 *
 * Two modes on the same read:
 * - Browse (default, free): every asset, `sort` `newest` (default) or
 *   `oldest`, paginated via `limit` + `cursor`. Pass `pagination.cursor`
 *   back as `cursor` to fetch the next page while `pagination.hasMore` is
 *   `true`.
 * - Semantic search: pass `q` to rank images by what they show (1 credit
 *   per new search; relevance order, `sort` ignored). Logos are not
 *   searchable.
 *
 * Narrow either mode with `kind` (`logo`, `brand` or `generated`). The
 * `type` and `aspectRatio` filters were retired by the API
 * (brew-v2#1713), which refuses them with a `400` naming `kind`.
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
        kind: input.kind,
        sort: input.sort,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getImages
}
