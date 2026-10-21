import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Caller-facing input for a CSV bulk import: the request body of
 * `POST /v1/contacts/import-csv`, straight from the spec.
 *
 * - `csv` is the raw CSV text (header row + rows).
 * - `mapping` is an optional `{ csvColumn: contactField }` lookup that
 *   overrides header inference. Supply it when the CSV column names do not
 *   match Brew contact fields.
 * - `validate: true` deliverability-checks every imported address and saves
 *   the verdict onto each contact. A CSV of ≤100 data rows validates INLINE
 *   and the response gains a `validation` counts object
 *   (`{ valid, risky, invalid, unscored }`); a larger CSV imports first,
 *   then validates as a BACKGROUND job and the response gains a
 *   `validationJobId` instead. Both the cutoff and the meter count CSV data
 *   rows, including rows skipped for a missing or invalid email and repeated
 *   addresses: 2 credits per data row, charged only on success; insufficient
 *   credits fail with `402 INSUFFICIENT_CREDITS`.
 * - `consent` stamps a marketing consent record on every imported row
 *   (typically `{ source: 'import' }`).
 * - `dateOrder` (`month_first` | `day_first`) says how to read a date column
 *   whose dates read either way (`03/04/2026`): `day_first` is 3 April. A
 *   day over 12 anywhere in the column overrides it. Without it such a
 *   column reads month-first and the response carries a
 *   `DATE_ORDER_ASSUMED` warning naming the field.
 * - `fileName` names the batch in Brew's Import History and is stamped on
 *   every contact it writes as `csvFileName`; the response's `importId` is
 *   the batch's id, carried by each contact it wrote until a later import
 *   touches it.
 */
export type ImportCsvContactsInput =
  components['schemas']['ContactsImportCsvRequest']

/** The same envelope as `ImportContactsResponse` (one shared component). */
export type ImportCsvContactsResponse =
  components['schemas']['ContactsImportResponse']

/**
 * Aggregate counts for a CSV import. Every data row lands in exactly one
 * bucket: `inserted + updated + failed + skipped === total`.
 */
export type ImportCsvSummary = ImportCsvContactsResponse['summary']

/** One per-row failure; `row` is the 1-based CSV data row (header excluded). */
export type ImportCsvError = ImportCsvContactsResponse['errors'][number]

/** One non-fatal normalization in `ImportCsvContactsResponse.warnings`. */
export type ImportCsvWarning = ImportCsvContactsResponse['warnings'][number]

/**
 * Bulk-import contacts from a raw CSV string.
 *
 * The wire format is `{ csv, mapping?, validate?, consent?, dateOrder?, fileName? }`.
 * The server parses the CSV,
 * auto-defines any custom fields it finds (returned in `fieldsCreated`),
 * and upserts each row.
 *
 * Returns the full `ContactsImportResponse` envelope: a `summary`
 * (`inserted`, `updated`, `failed`, `skipped`, summing to `total`), the
 * batch's `importId`, `fieldsCreated`, a per-row `errors` array, and a
 * `warnings` array surfacing non-fatal notes. Every failed row has an
 * `errors` entry and every skipped row a `CSV_ROW_SKIPPED` warning, each
 * naming its 1-based data `row` (header excluded). The response is the same
 * shape on full and partial success — inspect `summary.failed` and `errors`
 * to detect row-level problems; the transport does not throw on a
 * partial-failure status.
 *
 * Pass `validate: true` to deliverability-check every imported address and
 * persist the verdict onto each contact. A CSV of ≤100 data rows validates
 * inline and the envelope gains a `validation` counts object; a larger CSV
 * imports first then validates as a background job and the envelope gains a
 * `validationJobId` instead. The cutoff and the meter both count CSV data
 * rows (rows skipped for a missing or invalid email, and repeated addresses,
 * count): 2 credits per data row, charged only on success; insufficient
 * credits fail with `402 INSUFFICIENT_CREDITS`.
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
