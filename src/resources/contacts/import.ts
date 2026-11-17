import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Caller-facing input for a JSON bulk import: the request body of
 * `POST /v1/contacts/import`, straight from the spec.
 *
 * - `contacts` holds up to 1000 rows in the batch-create shape
 *   (`email`, `firstName`, `lastName`, `subscribed`, `customFields`,
 *   `consent`). A missing/invalid or repeated email fails its row.
 * - `consent` is the default consent record for every row without its own
 *   (typically `{ source: 'import' }`).
 * - `validate: true` requests deliverability checks for imported addresses.
 *   Submissions of at most 100 contacts select inline validation, metered at
 *   2 credits per submitted contact; `validation` counts appear when a check
 *   runs. Larger submissions use a background workflow, charged per address
 *   as it runs, with `validationJobId` when queued. Neither field is
 *   guaranteed when there are no addresses to check or no work to queue.
 * - `fileName` names the batch in Brew's Import History and is stamped on
 *   every contact it writes as `csvFileName`.
 * - `dryRun: true` returns the response this import would return and writes
 *   nothing (no contacts, field definitions or Import History batch); the
 *   response carries `dryRun: true` and no `importId`, `validate` is not run
 *   and nothing is charged.
 * - `onConflict` (`upsert` default | `skip`): `skip` only creates missing
 *   contacts and leaves every existing one unchanged, counted in
 *   `summary.skipped` with a `CONTACT_EXISTS_SKIPPED` warning naming its
 *   `row`.
 */
export type ImportContactsInput = components['schemas']['ContactsImportRequest']

export type ImportContactsResponse =
  components['schemas']['ContactsImportResponse']

/** Import counts: `inserted + updated + failed + skipped === total`. */
export type ImportContactsSummary = ImportContactsResponse['summary']

/** One failure; optional `row` is a positive, 1-based index into `contacts`. */
export type ImportContactsError = ImportContactsResponse['errors'][number]

/** One non-fatal note; optional `row` is a positive, 1-based contact index. */
export type ImportContactsWarning = ImportContactsResponse['warnings'][number]

/**
 * Bulk-import contacts from JSON rows, recorded as ONE Import History batch.
 *
 * The JSON twin of `importCsv`: missing contacts are created (subscribed
 * unless a row says `subscribed: false`), existing ones updated (left alone
 * with `onConflict: 'skip'`), and the response carries the batch's
 * `importId` (absent on a `dryRun` preview), which each written contact
 * carries too until a later import touches it (filter on it to list them;
 * deleting the import in the app removes the contacts it created). Use `upsertMany` instead for recurring
 * syncs that should not appear in Import History.
 *
 * The response is the same shape on full and partial success (200 / 207):
 * `summary.total` counts submitted contacts and equals
 * `inserted + updated + failed + skipped` (`skipped` counts existing
 * contacts left alone by `onConflict: 'skip'`, else 0 for JSON).
 * Inspect `summary.failed` and `errors` for row-level problems. Errors and
 * warnings can name the contact with `row`: `contacts[row - 1]`.
 */
export function createImportContacts(client: HttpClient) {
  function importContacts(
    input: ImportContactsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ImportContactsResponse>>
  function importContacts(
    input: ImportContactsInput,
    options?: RequestOptions
  ): Promise<ImportContactsResponse>
  async function importContacts(
    input: ImportContactsInput,
    options?: RequestOptions
  ): Promise<ImportContactsResponse | BrewRawResponse<ImportContactsResponse>> {
    const response = await client.request<ImportContactsResponse>({
      method: 'POST',
      path: '/v1/contacts/import',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return importContacts
}
