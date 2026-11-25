import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactConsentInput } from './types'

export type UpsertManyContactRow = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly subscribed?: boolean
  readonly customFields?: { readonly [key: string]: unknown }
  readonly consent?: ContactConsentInput
}

export type UpsertManyContactsInput = {
  readonly contacts: ReadonlyArray<UpsertManyContactRow>
  readonly consent?: ContactConsentInput
  readonly validate?: boolean
}

export type UpsertManyContactsResponse =
  components['schemas']['ContactsPostBatchResponse']

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
