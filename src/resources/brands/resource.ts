import type { HttpClient } from '../../core/http'

import { createCreateBrand } from './create'
import { createListBrands } from './list'

export type BrandsResource = {
  readonly create: ReturnType<typeof createCreateBrand>
  readonly list: ReturnType<typeof createListBrands>
}

export function createBrandsResource(client: HttpClient): BrandsResource {
  return {
    create: createCreateBrand(client),
    list: createListBrands(client),
  }
}
