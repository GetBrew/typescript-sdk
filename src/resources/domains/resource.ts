import type { HttpClient } from '../../core/http'

import { createAddDomain } from './add'
import { createDeleteDomain } from './delete'
import { createGetDomain } from './get'
import { createListDomains, createListSendableDomains } from './list'
import { createUpdateDomainSettings } from './settings'
import { createVerifyDomain } from './verify'

export type DomainsResource = {
  /** `GET /v1/domains` — ALL domains (incl. pending + DNS records). */
  readonly list: ReturnType<typeof createListDomains>
  /** `GET /v1/domains?sendableOnly=true` — only verified, send-ready domains. */
  readonly listSendable: ReturnType<typeof createListSendableDomains>
  /** `GET /v1/domains?domainId=…` — single domain (one-element envelope). */
  readonly get: ReturnType<typeof createGetDomain>
  /** `POST /v1/domains` — add a domain (returns pending + DNS records). */
  readonly add: ReturnType<typeof createAddDomain>
  /** `PATCH /v1/domains { domainId, verify: true }` — re-check DNS + persist status. */
  readonly verify: ReturnType<typeof createVerifyDomain>
  /** `PATCH /v1/domains { domainId, default*… }` — set sender defaults. */
  readonly updateSettings: ReturnType<typeof createUpdateDomainSettings>
  /** `DELETE /v1/domains` — idempotent remove. */
  readonly delete: ReturnType<typeof createDeleteDomain>
}

export function createDomainsResource(client: HttpClient): DomainsResource {
  return {
    list: createListDomains(client),
    listSendable: createListSendableDomains(client),
    get: createGetDomain(client),
    add: createAddDomain(client),
    verify: createVerifyDomain(client),
    updateSettings: createUpdateDomainSettings(client),
    delete: createDeleteDomain(client),
  }
}
