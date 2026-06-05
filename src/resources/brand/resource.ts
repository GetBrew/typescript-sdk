import type { HttpClient } from '../../core/http'

import { createGetBrand } from './get'

export type BrandResource = {
  /** `GET /v1/brand` — the key's brand + extraction readiness (scope: `emails`). */
  readonly get: ReturnType<typeof createGetBrand>
}

export function createBrandResource(client: HttpClient): BrandResource {
  return {
    get: createGetBrand(client),
  }
}
