import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { BrandImagesResponse, ListBrandImagesInput } from './types'

export type { BrandImagesResponse, ListBrandImagesInput }

/**
 * `GET /v1/brand/images` — the brand's asset library, as the Assets page in
 * the Brew app shows it: logos, brand images (from the site or uploaded,
 * including the social preview and site screenshot) and images made with
 * Brew. Requires the `emails` scope.
 *
 * Two modes on the same read:
 * - Browse (default, free): every asset, `sort: 'newest'` (default) or
 *   `'oldest'`, paginated via `limit` + `cursor`. Pass `pagination.cursor`
 *   back as `cursor` while `pagination.hasMore` is `true`.
 * - Semantic search: pass `q` to rank brand and generated images by
 *   meaning. 1 credit for the first page (continuing with `cursor` is
 *   free); results come in relevance order and `sort` is ignored. Logos
 *   are not searchable.
 *
 * Narrow either mode with `kind`: `'logo'`, `'brand'` or `'generated'`.
 * Each row carries `assetId` — the id the app opens at
 * `/assets?image=<assetId>` — plus `kind`, `url` and what is known about it
 * (`description`, `width`, `height`, `category`, `pageUrl`, `addedAt`, and a
 * logo's `logo` variant).
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
