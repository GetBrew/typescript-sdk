import type { HttpClient } from '../../core/http'

import { createDeleteBrandImage } from './delete-image'
import { createGetBrand } from './get'
import { createGetBrandImages } from './get-images'
import { createUpdateBrand } from './patch'

export type BrandResource = {
  /** `GET /v1/brand` — the key's brand + extraction readiness; pass `include` to embed `identity`/`emailDesign`/`imageStyle`/`logos` (scope: `emails`). */
  readonly get: ReturnType<typeof createGetBrand>
  /** `PATCH /v1/brand` — update `identity` (shallow-merge) and/or the `emailDesign`/`imageStyle` markdown (scope: `emails`). */
  readonly patch: ReturnType<typeof createUpdateBrand>
  /** Alias for {@link patch} — `PATCH /v1/brand`. */
  readonly update: ReturnType<typeof createUpdateBrand>
  /** `GET /v1/brand/images` — the brand's asset library (logos, brand images, images made with Brew): browse (free, `sort`) or semantic search via `q`; narrow with `kind` (scope: `emails`). */
  readonly getImages: ReturnType<typeof createGetBrandImages>
  /** `DELETE /v1/brand/images/{assetId}` — remove one image from the library (free, idempotent; not logos) (scope: `emails`). */
  readonly deleteImage: ReturnType<typeof createDeleteBrandImage>
}

export function createBrandResource(client: HttpClient): BrandResource {
  const patch = createUpdateBrand(client)
  return {
    get: createGetBrand(client),
    patch,
    update: patch,
    getImages: createGetBrandImages(client),
    deleteImage: createDeleteBrandImage(client),
  }
}
