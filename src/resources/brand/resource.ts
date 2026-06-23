import type { HttpClient } from '../../core/http'

import { createGetBrand } from './get'
import { createGetBrandEmailDesign } from './get-email-design'
import { createGetBrandIdentity } from './get-identity'
import { createGetBrandImages } from './get-images'
import { createGetBrandImageStyle } from './get-image-style'
import { createGetBrandLogos } from './get-logos'
import { createUpdateBrandEmailDesign } from './update-email-design'
import { createUpdateBrandIdentity } from './update-identity'
import { createUpdateBrandImageStyle } from './update-image-style'

export type BrandResource = {
  /** `GET /v1/brand` — the key's brand + extraction readiness (scope: `emails`). */
  readonly get: ReturnType<typeof createGetBrand>
  /** `GET /v1/brand/email-design` — the brand's `email-design.md` markdown (scope: `emails`). */
  readonly getEmailDesign: ReturnType<typeof createGetBrandEmailDesign>
  /** `PUT /v1/brand/email-design` — replace the `email-design.md` markdown (scope: `emails`). */
  readonly updateEmailDesign: ReturnType<typeof createUpdateBrandEmailDesign>
  /** `GET /v1/brand/image-style` — the brand's `image-style.md` markdown (scope: `emails`). */
  readonly getImageStyle: ReturnType<typeof createGetBrandImageStyle>
  /** `PUT /v1/brand/image-style` — replace the `image-style.md` markdown (scope: `emails`). */
  readonly updateImageStyle: ReturnType<typeof createUpdateBrandImageStyle>
  /** `GET /v1/brand/identity` — the brand's structured identity (scope: `emails`). */
  readonly getIdentity: ReturnType<typeof createGetBrandIdentity>
  /** `PATCH /v1/brand/identity` — shallow-merge identity fields (scope: `emails`). */
  readonly updateIdentity: ReturnType<typeof createUpdateBrandIdentity>
  /** `GET /v1/brand/logos` — the brand's CDN-hosted logo variants (scope: `emails`). */
  readonly getLogos: ReturnType<typeof createGetBrandLogos>
  /** `GET /v1/brand/images` — the brand's paginated image library (scope: `emails`). */
  readonly getImages: ReturnType<typeof createGetBrandImages>
}

export function createBrandResource(client: HttpClient): BrandResource {
  return {
    get: createGetBrand(client),
    getEmailDesign: createGetBrandEmailDesign(client),
    updateEmailDesign: createUpdateBrandEmailDesign(client),
    getImageStyle: createGetBrandImageStyle(client),
    updateImageStyle: createUpdateBrandImageStyle(client),
    getIdentity: createGetBrandIdentity(client),
    updateIdentity: createUpdateBrandIdentity(client),
    getLogos: createGetBrandLogos(client),
    getImages: createGetBrandImages(client),
  }
}
