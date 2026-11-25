import type { HttpClient } from '../../core/http'

import { createDeleteBrandImage } from './delete-image'
import { createGetBrand } from './get'
import { createGetBrandImages } from './get-images'
import { createUpdateBrand } from './patch'

export type BrandResource = {
  readonly get: ReturnType<typeof createGetBrand>
  readonly patch: ReturnType<typeof createUpdateBrand>
  readonly update: ReturnType<typeof createUpdateBrand>
  readonly getImages: ReturnType<typeof createGetBrandImages>
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
