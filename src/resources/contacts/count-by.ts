import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { CountContactsInput } from './count'

type ContactsSearchRequest = components['schemas']['ContactsSearchRequest']

type GroupByField = NonNullable<ContactsSearchRequest['groupBy']>[number]
/** One or two fields; the API refuses an empty list or a third field. */
type GroupBy = readonly [GroupByField] | readonly [GroupByField, GroupByField]
type Bucket = NonNullable<ContactsSearchRequest['bucket']>

/**
 * Input to `brew.contacts.countBy`: the `count` predicate knobs plus at
 * least one of `groupBy` (up to two fields: a contact field, a custom
 * field, or `emailDomain`) and `bucket` (`day` | `week` | `month`, over
 * `createdAt`).
 */
export type CountContactsByInput = CountContactsInput &
  (
    | { readonly groupBy: GroupBy; readonly bucket?: Bucket }
    | { readonly groupBy?: GroupBy; readonly bucket: Bucket }
  )

/**
 * The total `count`, the largest 200 `groups` (`key` maps each grouped
 * field to its value; `bucket` is the ISO period start), and `otherCount`
 * for the contacts in the groups past the first 200.
 */
export type CountContactsByResponse =
  components['schemas']['ContactsCountResponse']

/**
 * `POST /v1/contacts/search` with `count: true` and `groupBy` / `bucket`
 * (scope: `contacts`) — exact counts per field value, per email domain,
 * or per period, largest group first. Unlike `count`, it returns the whole
 * envelope, since the groups are the point.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<CountContactsByResponse>` instead of the unwrapped
 * envelope.
 */
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
