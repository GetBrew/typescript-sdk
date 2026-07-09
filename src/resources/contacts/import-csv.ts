import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Caller-facing input for a CSV bulk import.
 *
 * `csv` is the raw CSV text (header row + rows). `mapping` is an optional
 * `{ csvColumn: contactField }` lookup that overrides header inference —
 * supply it when the CSV column names do not match Brew contact fields.
 */
export type ImportCsvContactsInput = {
  readonly csv: string
  readonly mapping?: { readonly [key: string]: string }
  /**
   * When `true`, every imported address is deliverability-checked and the
   * verdict is saved onto each contact. ≤100 addresses validate INLINE —
   * the response gains an optional `validation` counts object
   * (`{ valid, risky, invalid, unscored }`). >100 addresses import first,
   * then validate as a BACKGROUND job — the response instead gains a
   * `validationJobId` string. Metered 2 credits per address, charged only
   * on success; insufficient credits fail the request with
   * `402 INSUFFICIENT_CREDITS`.
   */
  readonly validate?: boolean
}

export type ImportCsvContactsResponse =
  components['schemas']['ContactsImportCsvResponse']

/** Aggregate counts for a CSV import (inserted/updated/failed/skipped). */
export type ImportCsvSummary = ImportCsvContactsResponse['summary']

/** One per-row failure in `ImportCsvContactsResponse.errors`. */
export type ImportCsvError = ImportCsvContactsResponse['errors'][number]

/** One non-fatal normalization in `ImportCsvContactsResponse.warnings`. */
export type ImportCsvWarning = ImportCsvContactsResponse['warnings'][number]

/**
 * Bulk-import contacts from a raw CSV string.
 *
 * The wire format is `{ csv, mapping? }`. The server parses the CSV,
 * auto-defines any custom fields it finds (returned in `fieldsCreated`),
 * and upserts each row.
 *
 * Returns the full `ContactsImportCsvResponse` envelope: a `summary`
 * (inserted/updated/failed/skipped counts), `fieldsCreated`, a per-row
 * `errors` array, and a `warnings` array surfacing non-fatal
 * normalizations. The response is the same shape on full and partial
 * success — inspect `summary.failed` and `errors` to detect row-level
 * problems; the transport does not throw on a partial-failure status.
 *
 * Pass `validate: true` to deliverability-check every imported address and
 * persist the verdict onto each contact. ≤100 addresses validate inline and
 * the envelope gains a `validation` counts object; >100 addresses import
 * first then validate as a background job and the envelope gains a
 * `validationJobId` instead. Metered 2 credits per address, charged only on
 * success; insufficient credits fail with `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ImportCsvContactsResponse>` instead of the unwrapped
 * payload.
 */
export function createImportCsvContacts(client: HttpClient) {
  function importCsv(
    input: ImportCsvContactsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ImportCsvContactsResponse>>
  function importCsv(
    input: ImportCsvContactsInput,
    options?: RequestOptions
  ): Promise<ImportCsvContactsResponse>
  async function importCsv(
    input: ImportCsvContactsInput,
    options?: RequestOptions
  ): Promise<
    ImportCsvContactsResponse | BrewRawResponse<ImportCsvContactsResponse>
  > {
    const response = await client.request<ImportCsvContactsResponse>({
      method: 'POST',
      path: '/v1/contacts/import-csv',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importCsv
}
