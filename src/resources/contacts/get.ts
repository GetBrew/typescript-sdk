import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { operations } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** The one expansion `GET /v1/contacts/{email}` accepts. */
export const CONTACTS_INCLUDE_TOKENS = ['openProfile'] as const
export type ContactsIncludeToken = (typeof CONTACTS_INCLUDE_TOKENS)[number]

/**
 * Per-request options for `brew.contacts.get(...)` — the standard
 * `RequestOptions` plus the `include` expansion.
 */
export type GetContactOptions = RequestOptions & {
  /**
   * `'openProfile'` attaches `openProfile`, the contact's smart-send
   * open-time profile (`null` when no opens are folded yet). It needs the
   * `emails` scope as well as `contacts` (`403 INSUFFICIENT_PERMISSIONS`
   * without it). Accepts a token, an array of tokens, or a comma string.
   */
  readonly include?: ReadonlyArray<ContactsIncludeToken> | string
}

/**
 * `GET /v1/contacts/{email}` returns the BARE contact row, plus
 * `openProfile` when `include` asks for it. Derived from the generated
 * `getContact` operation, so it follows the response schema the route
 * actually declares.
 */
export type GetContactResponse =
  operations['getContact']['responses'][200]['content']['application/json']

/**
 * `GET /v1/contacts/{email}` (scope: `contacts`) — one contact by email
 * address, returned as the BARE row: core columns, consent record,
 * validation verdict, suppression state, and `customFields`.
 *
 * `include: 'openProfile'` attaches `openProfile`: the smart-send
 * open-time profile — 48 UTC half-hour open counts (`histogram`),
 * `totalOpens`, `lastOpenedAt`, and once there is enough history
 * `bestOpenMinuteUtc`, `bestSendMinuteUtc` and `confidence`; `null` when
 * the contact has no opens folded yet. It is not bot detection: machine
 * opens cannot be told apart in it. It needs the `emails` scope as well
 * (`403 INSUFFICIENT_PERMISSIONS` without it).
 *
 * An email with no contact is `404 CONTACT_NOT_FOUND` — you no longer
 * have to look one up with a `{ field: 'email', operator: 'equals' }`
 * search and test for an empty page.
 *
 * The address is URL-encoded for you, so `a+b@example.com` works as
 * written.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetContactResponse>` instead of the unwrapped row.
 */
export function createGetContact(client: HttpClient) {
  function getContact(
    email: string,
    options: GetContactOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetContactResponse>>
  function getContact(
    email: string,
    options?: GetContactOptions
  ): Promise<GetContactResponse>
  async function getContact(
    email: string,
    options?: GetContactOptions
  ): Promise<GetContactResponse | BrewRawResponse<GetContactResponse>> {
    const include = serializeInclude({ include: options?.include })
    const response = await client.request<GetContactResponse>({
      method: 'GET',
      path: `/v1/contacts/${encodeURIComponent(email)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getContact
}
