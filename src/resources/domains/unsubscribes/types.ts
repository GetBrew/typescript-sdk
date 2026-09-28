import type { components, operations } from '../../../generated/openapi-types'

/**
 * One address on a marketing domain's unsubscribe list. `scope` says
 * which opt-out it carries: `domain` (this host's list), `all` (the
 * brand-wide opt-out — `subscribed: false` on the contact, which blocks
 * every marketing send) or `both`.
 */
export type DomainUnsubscribe = components['schemas']['DomainUnsubscribeRow']

/** Which opt-out a row carries: `domain`, `all`, or `both`. */
export type DomainUnsubscribeScope = DomainUnsubscribe['scope']

/**
 * `{ domainId, domainHost, data, pagination }` — one page of the list,
 * newest first.
 */
export type DomainUnsubscribesList =
  components['schemas']['DomainUnsubscribesListResponse']

/** Query knobs for the list read: `q`, `scope`, `limit`, `cursor`. */
export type ListDomainUnsubscribesQuery = NonNullable<
  operations['listDomainUnsubscribes']['parameters']['query']
>

/**
 * Which opt-outs a list or export includes: `domain` = this host's list
 * only, `all` = the brand-wide opt-out only, `any` (default) = either.
 */
export type DomainUnsubscribesScopeFilter = NonNullable<
  ListDomainUnsubscribesQuery['scope']
>

/** Body of `POST /v1/domains/{domainId}/unsubscribes` — up to 1,000 `emails`. */
export type AddDomainUnsubscribesBody =
  components['schemas']['DomainUnsubscribesAddRequest']

/** Per-call `summary` counts plus the `invalid` addresses that were skipped. */
export type DomainUnsubscribesAddResult =
  components['schemas']['DomainUnsubscribesAddResponse']

/** `DELETE /v1/domains/{domainId}/unsubscribes/{email}` result. */
export type DomainUnsubscribeRemoveResult =
  components['schemas']['DomainUnsubscribeRemoveResponse']

/** Body of `POST /v1/domains/{domainId}/unsubscribes/import`. */
export type ImportDomainUnsubscribesBody =
  components['schemas']['DomainUnsubscribesImportRequest']

/** Import `summary`, a `skippedSample`, `truncated`, and the `column` read. */
export type DomainUnsubscribesImportResult =
  components['schemas']['DomainUnsubscribesImportResponse']

/** Query for the export: the optional `scope` filter. */
export type ExportDomainUnsubscribesQuery = NonNullable<
  operations['exportDomainUnsubscribes']['parameters']['query']
>

/** The list as CSV text inside the JSON envelope, with `rowCount` + `truncated`. */
export type DomainUnsubscribesExport =
  components['schemas']['DomainUnsubscribesExportResponse']
