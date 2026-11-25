import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { operations } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

export const CONTACTS_INCLUDE_TOKENS = ['openProfile'] as const
export type ContactsIncludeToken = (typeof CONTACTS_INCLUDE_TOKENS)[number]

export type GetContactOptions = RequestOptions & {
  readonly include?: ReadonlyArray<ContactsIncludeToken> | string
}

export type GetContactResponse =
  operations['getContact']['responses'][200]['content']['application/json']

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
