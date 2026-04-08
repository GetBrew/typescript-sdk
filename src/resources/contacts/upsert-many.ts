import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import type { Contact } from './types'
import type { UpsertContactInput } from './upsert'

export type UpsertManyContactsInput = {
  readonly contacts: ReadonlyArray<UpsertContactInput>
}

export type UpsertManyContactsResponse = {
  readonly contacts: ReadonlyArray<Contact>
}

/**
 * Batch upsert multiple contacts in one request.
 *
 * The wire format is simply `{ contacts: [...] }` — the raw API
 * multiplexes single vs. batch on POST /v1/contacts by body shape, so the
 * SDK keeps that distinction explicit via separate `upsert` / `upsertMany`
 * methods rather than overloading one.
 *
 * The returned envelope is passed through verbatim so callers can see
 * which contacts were written and in what order. If the batch endpoint
 * eventually grows per-row error reporting, the response type here is the
 * single place to extend.
 */
export function createUpsertManyContacts(client: HttpClient) {
  return async (
    input: UpsertManyContactsInput,
    options?: RequestOptions
  ): Promise<UpsertManyContactsResponse> => {
    const response = await client.request<UpsertManyContactsResponse>({
      method: 'POST',
      path: '/v1/contacts',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
