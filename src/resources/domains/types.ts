import type { components } from '../../generated/openapi-types'

export type Domain =
  components['schemas']['DomainsListResponse']['domains'][number]
