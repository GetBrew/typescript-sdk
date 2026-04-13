import type { HttpClient } from '../../core/http'

import { createListDomains } from './list'

export type DomainsResource = {
  readonly list: ReturnType<typeof createListDomains>
}

export function createDomainsResource(client: HttpClient): DomainsResource {
  return {
    list: createListDomains(client),
  }
}
