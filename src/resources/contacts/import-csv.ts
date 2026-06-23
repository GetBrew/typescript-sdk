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
