import type { HttpClient } from '../../core/http'

import { createCreateBrand } from './create'
import { createGetBrand } from './get'
import { createListBrands } from './list'

/**
 * Brand LIFECYCLE — the only ORGANIZATION-level resource in the SDK.
 *
 * Distinct from `client.brand` (singular), which reads the design context of
 * whichever brand the current request acts on. These act across the
 * organization and take no `X-Brand-Id`.
 */
export type BrandsResource = {
  /** `GET /v1/brands` — the brands this key can reach (scope: `emails`). */
  readonly list: ReturnType<typeof createListBrands>
  /** `POST /v1/brands` — create a brand + start extraction; organization-scoped keys only (scope: `brands`). */
  readonly create: ReturnType<typeof createCreateBrand>
  /** `GET /v1/brands/{brandId}` — lifecycle state; the poll for `create` (scope: `emails`). */
  readonly get: ReturnType<typeof createGetBrand>
}

export function createBrandsResource(client: HttpClient): BrandsResource {
  return {
    list: createListBrands(client),
    create: createCreateBrand(client),
    get: createGetBrand(client),
  }
}
