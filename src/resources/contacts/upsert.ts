import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Caller-facing input for a single-contact upsert.
 *
 * The OpenAPI spec types this as the first variant of `ContactsPostRequest`:
 * `{ email?, firstName?, lastName?, subscribed?, customFields? }`. Email
 * is technically optional in the schema (the API tolerates batch shape
 * detection by inspecting `contacts[]`), but the SDK requires it on the
 * single-upsert path because calling `upsert` without an email is always
 * a programming error.
 */
export type UpsertContactInput = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly subscribed?: boolean
  readonly customFields?: { readonly [key: string]: unknown }
}

export type UpsertContactResponse =
  components['schemas']['ContactsPostSingleResponse']

/**
 * Create or update a single contact by email.
 *
 * The transport auto-attaches an `Idempotency-Key` header on POST, so
 * retries on transient failures are safe by default. A caller-supplied
 * key can be passed via `options.idempotencyKey` when integrating with
 * an upstream queue that already provides one.
 *
 * Returns the full `ContactsPostSingleResponse` envelope (contact +
 * `created` flag + `fieldsCreated` array + `warnings`) rather than just
 * the contact, because all four fields carry signal — `created`
 * distinguishes insert from update, `fieldsCreated` lists any custom
 * fields the upsert auto-defined, and `warnings` surfaces non-fatal
 * normalizations.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<UpsertContactResponse>` instead of the unwrapped
 * payload.
 */
export function createUpsertContact(client: HttpClient) {
  function upsert(
    input: UpsertContactInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<UpsertContactResponse>>
  function upsert(
    input: UpsertContactInput,
    options?: RequestOptions
  ): Promise<UpsertContactResponse>
  async function upsert(
    input: UpsertContactInput,
    options?: RequestOptions
  ): Promise<UpsertContactResponse | BrewRawResponse<UpsertContactResponse>> {
    const response = await client.request<UpsertContactResponse>({
      method: 'POST',
      path: '/v1/contacts',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return upsert
}
