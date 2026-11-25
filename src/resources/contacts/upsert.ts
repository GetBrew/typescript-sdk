import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactConsentInput } from './types'

export type UpsertContactInput = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly subscribed?: boolean
  readonly customFields?: { readonly [key: string]: unknown }
  readonly consent?: ContactConsentInput
  readonly validate?: boolean
}

export type UpsertContactResponse =
  components['schemas']['ContactsPostSingleResponse']

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
