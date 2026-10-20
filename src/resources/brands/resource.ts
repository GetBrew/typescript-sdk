import type { HttpClient } from '../../core/http'

import { createCreateBrand } from './create'
import { createGetBrand } from './get'
import { createListBrands } from './list'
import { createWaitForExtraction } from './wait-for-extraction'

/**
 * Brand LIFECYCLE — an ORGANIZATION-level resource in the SDK.
 *
 * Distinct from `client.brand` (singular), which reads the design context of
 * whichever brand the current request acts on. These act across the
 * organization and take no `X-Brand-Id`.
 */
export type BrandsResource = {
  /** `GET /v1/brands` — permission-agnostic discovery within the credential boundary. */
  readonly list: ReturnType<typeof createListBrands>
  /** `POST /v1/brands` — create a brand + start extraction; organization-scoped keys only (scope: `brands`). */
  readonly create: ReturnType<typeof createCreateBrand>
  /** `GET /v1/brands/{brandId}` — permission-agnostic lifecycle poll for `create`. */
  readonly get: ReturnType<typeof createGetBrand>
  /** Poll lifecycle status until extraction ends, with a total deadline. Inspect the returned `ready` flag. */
  readonly waitForExtraction: ReturnType<typeof createWaitForExtraction>
}

export function createBrandsResource(
  client: HttpClient,
  clientSignal?: AbortSignal
): BrandsResource {
  return {
    list: createListBrands(client),
    create: createCreateBrand(client),
    get: createGetBrand(client),
    waitForExtraction: createWaitForExtraction(client, clientSignal),
  }
}
