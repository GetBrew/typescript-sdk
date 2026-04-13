import type { components } from '../../generated/openapi-types'

export type Brand =
  components['schemas']['BrandsListResponse']['brands'][number]
