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
 * - `dryRun: true` returns the response this import would return and writes
 *   nothing: no contacts, field definitions or Import History batch. The
 *   response carries `dryRun: true` and no `importId`; `validate` is not run
 *   and nothing is charged. A real run on the same data right after returns
 *   the same counts.
 * - `onConflict` (`upsert` default | `skip`): `skip` only creates missing
 *   contacts and leaves every existing one unchanged, counted in
 *   `summary.skipped` with a `CONTACT_EXISTS_SKIPPED` warning naming its
 *   `row`.
 */
export type ImportCsvContactsInput =
  components['schemas']['ContactsImportCsvRequest']

/** The same envelope as `ImportContactsResponse` (one shared component). */
export type ImportCsvContactsResponse =
  components['schemas']['ContactsImportResponse']

/** CSV counts: `inserted + updated + failed + skipped === total`. */
export type ImportCsvSummary = ImportCsvContactsResponse['summary']

/** One failure; optional `row` is a positive CSV data-row number (no header). */
export type ImportCsvError = ImportCsvContactsResponse['errors'][number]

/** One non-fatal note; `row` is absent for aggregate or column-level notes. */
export type ImportCsvWarning = ImportCsvContactsResponse['warnings'][number]

/**
 * Bulk-import contacts from a raw CSV string.
 *
 * The wire format is
 * `{ csv, mapping?, validate?, consent?, dateOrder?, fileName?, dryRun?, onConflict? }`.
 * The server parses the CSV,
 * auto-defines any custom fields it finds (returned in `fieldsCreated`),
 * and upserts each row.
 *
 * Returns the full `ContactsImportResponse` envelope: a `summary`
 * (`inserted`, `updated`, `failed`, `skipped`, and their sum `total`), the
 * batch's `importId`, `fieldsCreated`, a per-row `errors` array, and a
 * `warnings` array surfacing non-fatal notes. The response is the same
 * shape on full and partial success — inspect `summary.failed` and `errors`
 * to detect row-level problems; the transport does not throw on a
 * partial-failure status.
 *
 * When present, `row` on an error or warning is a positive, 1-based CSV data
 * row (the header is excluded). `CSV_ROW_SKIPPED` warnings identify up to
 * the first 100 skipped rows. If more are skipped, a final warning counts
 * the remainder without a `row`. Read `summary.skipped` for the full count.
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
 * Pass `dryRun: true` to preview the same envelope without writing (see
 * `ImportCsvContactsInput`), and `onConflict: 'skip'` to leave existing
 * contacts unchanged.
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
