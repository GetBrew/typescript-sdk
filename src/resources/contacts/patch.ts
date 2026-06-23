import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/**
 * Patchable fields on a contact. Email travels in the path now; the wire
 * body is just `{ fields: { ... } }` — an open object containing any
 * combination of writable core fields (`firstName`, `lastName`,
 * `subscribed`) and custom fields.
 *
 * The SDK keeps `email` on the input object (so callers pass one record)
 * and splits it out into the path / body at the request boundary.
 */
export type PatchContactInput = {
  readonly email: string
  readonly fields: { readonly [key: string]: unknown }
}

export type PatchContactResponse =
  components['schemas']['ContactsPatchResponse']

/**
 * `PATCH /v1/contacts/{email}` (scope: `contacts`) — partially update a
 * contact by email.
 *
 * Email moved into the path; only `{ fields }` is sent in the body.
 * Returns the full envelope which includes the updated contact AND an
 * `updated` array of field names that actually changed — useful for
 * confirming whether a no-op patch (e.g. setting a field to its existing
 * value) actually wrote anything.
 *
 * PATCH is deliberately NOT retried by the transport, even with an
 * idempotency key — see `core/retry.ts` for the rationale.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<PatchContactResponse>` instead of the unwrapped
 * payload.
 */
export function createPatchContact(client: HttpClient) {
  function patch(
    input: PatchContactInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchContactResponse>>
  function patch(
    input: PatchContactInput,
    options?: RequestOptions
  ): Promise<PatchContactResponse>
  async function patch(
    input: PatchContactInput,
    options?: RequestOptions
  ): Promise<PatchContactResponse | BrewRawResponse<PatchContactResponse>> {
    const response = await client.request<PatchContactResponse>({
      method: 'PATCH',
      path: `/v1/contacts/${encodeURIComponent(input.email)}`,
      body: { fields: input.fields },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return patch
}
