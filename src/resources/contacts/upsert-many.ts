import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Per-row input for a batch upsert. Same shape as the single upsert
 * input minus the explicit type alias — the spec types each row of the
 * batch as the same object the single endpoint accepts.
 */
export type UpsertManyContactRow = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly subscribed?: boolean
  readonly customFields?: { readonly [key: string]: unknown }
}

export type UpsertManyContactsInput = {
  readonly contacts: ReadonlyArray<UpsertManyContactRow>
  /**
   * When `true`, every address in the batch is deliverability-checked and
   * the verdict is saved onto each matching contact. Batches of ≤100
   * addresses validate INLINE — the response gains an optional `validation`
   * counts object (`{ valid, risky, invalid, unscored }`). Batches of >100
   * upsert first, then validate as a BACKGROUND job — the response instead
   * gains a `validationJobId` string. Metered 2 credits per address,
   * charged only on success; insufficient credits fail the request with
   * `402 INSUFFICIENT_CREDITS`.
   */
  readonly validate?: boolean
}

export type UpsertManyContactsResponse =
  components['schemas']['ContactsPostBatchResponse']

/**
 * Batch upsert multiple contacts in one request.
 *
 * The wire format is `{ contacts: [...] }` — the raw API multiplexes
 * single vs. batch on POST /v1/contacts by body shape, so the SDK keeps
 * the distinction explicit via separate `upsert` / `upsertMany` methods
 * rather than overloading one.
 *
 * Returns the full `ContactsPostBatchResponse` envelope which includes a
 * `summary` (inserted/updated/failed counts), `fieldsCreated`, an
 * `errors` array (per-row failures), and `warnings`. Batch responses
 * are 200 on full success and 207 on partial failure — both come back
 * as the same envelope shape, the transport does not throw on 207.
 *
 * Pass `validate: true` to deliverability-check every address and persist
 * the verdict onto each contact. ≤100 addresses validate inline and the
 * envelope gains a `validation` counts object; >100 addresses upsert first
 * then validate as a background job and the envelope gains a
 * `validationJobId` instead. Metered 2 credits per address, charged only on
 * success; insufficient credits fail with `402 INSUFFICIENT_CREDITS`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<UpsertManyContactsResponse>` instead of the
 * unwrapped payload.
 */
export function createUpsertManyContacts(client: HttpClient) {
  function upsertMany(
    input: UpsertManyContactsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<UpsertManyContactsResponse>>
  function upsertMany(
    input: UpsertManyContactsInput,
    options?: RequestOptions
  ): Promise<UpsertManyContactsResponse>
  async function upsertMany(
    input: UpsertManyContactsInput,
    options?: RequestOptions
  ): Promise<
    UpsertManyContactsResponse | BrewRawResponse<UpsertManyContactsResponse>
  > {
    const response = await client.request<UpsertManyContactsResponse>({
      method: 'POST',
      path: '/v1/contacts',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return upsertMany
}
