import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import type { Contact, ContactCustomFields } from './types'

/**
 * Caller-facing input for a single-contact upsert. The email is required
 * because it is the identity. Every other field is optional — the API
 * treats absent fields as "leave unchanged" on update, not as "clear".
 */
export type UpsertContactInput = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly customFields?: ContactCustomFields
}

/**
 * Create or update a single contact by email.
 *
 * The transport auto-attaches an `Idempotency-Key` header on POST, so
 * retries on transient failures are safe without the caller having to
 * think about it. A caller-supplied key can be passed via
 * `options.idempotencyKey` when integrating with an upstream queue that
 * already provides one.
 */
export function createUpsertContact(client: HttpClient) {
  return async (
    input: UpsertContactInput,
    options?: RequestOptions
  ): Promise<Contact> => {
    const response = await client.request<{ contact: Contact }>({
      method: 'POST',
      path: '/v1/contacts',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data.contact
  }
}
