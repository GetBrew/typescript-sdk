import type { components, operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Input to `brew.emails.list(...)` — the single read for the emails
 * resource. Reads are FLAT: identity lives in the query.
 *
 * - Omit `emailId` to LIST the latest version of each design (newest
 *   first), filtered by `status` and the `createdAt*` / `updatedAt*`
 *   windows and paged with `limit` / `cursor`.
 * - Pass `emailId` to fetch ONE design — the response is a single-row
 *   page `{ data: [row] }` (no `pagination`).
 * - `include` is a detail-only opt-in expansion (requires `emailId`):
 *   `'html'` inlines the rendered HTML of the current version,
 *   `'versions'` inlines the version history. Pass either token, an
 *   array, or a comma string.
 *
 * Sourced from the generated `listEmails` query so any new knob upstream
 * surfaces as a compile error in the SDK.
 */
export type EmailsIncludeToken = 'html' | 'versions'

export type ListEmailsInput = Omit<
  NonNullable<operations['listEmails']['parameters']['query']>,
  'include'
> & {
  /**
   * Detail-only expansions (requires `emailId`). `'html'` inlines the
   * rendered HTML of the current version; `'versions'` inlines the
   * version history. Accepts an array of `'html' | 'versions'` tokens or
   * a comma string; serialized as the single comma-separated `?include=`
   * value.
   */
  readonly include?: ReadonlyArray<EmailsIncludeToken> | string
}

export type ListEmailsResponse = components['schemas']['EmailsListResponse']

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: ListEmailsInput['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/emails` (scope: `emails`) — the single read for email
 * designs, under the uniform `{ data, pagination? }` envelope. Reads are
 * flat: the identity lives in the query.
 *
 * - List mode (no `emailId`): the latest version of each design, newest
 *   first. Filter with `status` and the `createdAt*` / `updatedAt*`
 *   windows; page with `limit` / `cursor`.
 * - Detail mode (`emailId` set): a single-row page `{ data: [row] }`
 *   with no `pagination`. Opt into `include: 'html'` for the rendered
 *   HTML and/or `include: 'versions'` for the version history — both are
 *   detail-only (an `include` without `emailId` is `400 INVALID_REQUEST`).
 *
 * Unknown / cross-brand ids return an empty page in detail mode.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListEmailsResponse>` instead of the unwrapped
 * envelope.
 */
export function createListEmails(client: HttpClient) {
  function listEmails(
    input: ListEmailsInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListEmailsResponse>>
  function listEmails(
    input?: ListEmailsInput,
    options?: RequestOptions
  ): Promise<ListEmailsResponse>
  async function listEmails(
    input: ListEmailsInput = {},
    options?: RequestOptions
  ): Promise<ListEmailsResponse | BrewRawResponse<ListEmailsResponse>> {
    const { include, ...query } = input
    const response = await client.request<ListEmailsResponse>({
      method: 'GET',
      path: '/v1/emails',
      query: { ...query, include: serializeInclude(include) },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listEmails
}
