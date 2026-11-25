import type { HttpClient } from '../../core/http'

import { createCreateBrand } from './create'
import { createGetBrand } from './get'
import { createListBrands } from './list'
import { createWaitForExtraction } from './wait-for-extraction'

export type BrandsResource = {
  readonly list: ReturnType<typeof createListBrands>
  readonly create: ReturnType<typeof createCreateBrand>
  readonly get: ReturnType<typeof createGetBrand>
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
