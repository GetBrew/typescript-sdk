import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CountContactsInput } from './count'

type ContactsSearchRequest = components['schemas']['ContactsSearchRequest']

type GroupByField = NonNullable<ContactsSearchRequest['groupBy']>[number]
type GroupBy = readonly [GroupByField] | readonly [GroupByField, GroupByField]
type Bucket = NonNullable<ContactsSearchRequest['bucket']>

export type CountContactsByInput = CountContactsInput &
  (
    | { readonly groupBy: GroupBy; readonly bucket?: Bucket }
    | { readonly groupBy?: GroupBy; readonly bucket: Bucket }
  )

export type CountContactsByResponse =
  components['schemas']['ContactsCountResponse']

export function createCountContactsBy(client: HttpClient) {
  function countBy(
    input: CountContactsByInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CountContactsByResponse>>
  function countBy(
    input: CountContactsByInput,
    options?: RequestOptions
  ): Promise<CountContactsByResponse>
  async function countBy(
    input: CountContactsByInput,
    options?: RequestOptions
  ): Promise<
    CountContactsByResponse | BrewRawResponse<CountContactsByResponse>
  > {
    const response = await client.request<CountContactsByResponse>({
      method: 'POST',
      path: '/v1/contacts/search',
      body: { ...input, count: true },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return countBy
}
