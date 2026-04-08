import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import type { Contact, ContactCustomFields } from './types'

/**
 * Patchable fields on a contact. The email is NOT here — email is the
 * identity and lives in the top-level input object below.
 */
export type PatchContactUpdates = {
  readonly firstName?: string
  readonly lastName?: string
  readonly customFields?: ContactCustomFields
}

export type PatchContactInput = {
  readonly email: string
  readonly updates: PatchContactUpdates
}

/**
 * Partially update a contact by email. The SDK flattens
 * `{ email, updates: { ... } }` into the wire shape `{ email, ... }` so
 * the caller's mental model ("identity + fields to change") stays clean
 * while the API still gets the flat envelope it expects.
 *
 * PATCH is deliberately NOT retried by the transport, even with an
 * idempotency key — see `core/retry.ts` for the rationale.
 */
export function createPatchContact(client: HttpClient) {
  return async (
    input: PatchContactInput,
    options?: RequestOptions
  ): Promise<Contact> => {
    const body = { email: input.email, ...input.updates }
    const response = await client.request<{ contact: Contact }>({
      method: 'PATCH',
      path: '/v1/contacts',
      body,
      ...(options ? { options } : {}),
    })
    return response.data.contact
  }
}
