import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

/**
 * Patchable fields on a contact. The wire shape per the OpenAPI spec is
 * `{ email, fields: { ... } }` — `fields` is an open object containing
 * any combination of writable core fields (`firstName`, `lastName`,
 * `subscribed`) and custom fields (keys like `'customFields.plan'`).
 *
 * The SDK exposes the same shape directly to keep DX honest to the wire
 * format. Callers know what they are sending.
 */
export type PatchContactInput = {
  readonly email: string
  readonly fields: { readonly [key: string]: unknown }
}

export type PatchContactResponse =
  components['schemas']['ContactsPatchResponse']

/**
 * Partially update a contact by email.
 *
 * Returns the full envelope which includes the updated contact AND an
 * `updated` array of field names that actually changed — useful for
 * confirming whether a no-op patch (e.g. setting a field to its existing
 * value) actually wrote anything.
 *
 * PATCH is deliberately NOT retried by the transport, even with an
 * idempotency key — see `core/retry.ts` for the rationale.
 */
export function createPatchContact(client: HttpClient) {
  return async (
    input: PatchContactInput,
    options?: RequestOptions
  ): Promise<PatchContactResponse> => {
    const response = await client.request<PatchContactResponse>({
      method: 'PATCH',
      path: '/v1/contacts',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
