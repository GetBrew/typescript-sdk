import { expectTypeOf, it } from 'vitest'

import type {
  BrandsResource,
  CreateBrandInput,
  CreateBrandResponse,
  GetBrandStatusInput,
  GetBrandStatusResponse,
  ListBrandsInput,
  ListBrandsResponse,
} from '../src/index'

it('exports the complete public brand lifecycle surface', () => {
  expectTypeOf<BrandsResource>().toHaveProperty('list')
  expectTypeOf<CreateBrandInput>().toHaveProperty('url')
  expectTypeOf<CreateBrandResponse>().toHaveProperty('extraction')
  expectTypeOf<ListBrandsInput>().toHaveProperty('limit')
  expectTypeOf<ListBrandsResponse>().toHaveProperty('pagination')
  expectTypeOf<GetBrandStatusInput>().toHaveProperty('brandId')
  // v1 flattened the brand envelope: the row IS the response.
  expectTypeOf<GetBrandStatusResponse>().toHaveProperty('brandId')
  expectTypeOf<GetBrandStatusResponse>().toHaveProperty('ready')
})
