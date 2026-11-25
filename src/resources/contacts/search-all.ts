import { autoPaginate, pageReadOptions } from '../../core/pagination'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import {
  type ContactSearchRow,
  createSearchContacts,
  type SearchContactsInput,
} from './search'

export type SearchAllContactsInput = Readonly<
  Omit<SearchContactsInput, 'cursor'>
>

export function createSearchAllContacts(client: HttpClient) {
  const search = createSearchContacts(client)

  return function searchAllContacts(
    input: SearchAllContactsInput = {},
    options?: RequestOptions
  ): AsyncGenerator<ContactSearchRow, void, void> {
    return autoPaginate<ContactSearchRow>(
      async (cursor) => {
        const pageInput: SearchContactsInput = {
          ...input,
          ...(cursor !== null ? { cursor } : {}),
        }
        const response = await search(pageInput, pageReadOptions({ options }))
        return { items: response.data, pagination: response.pagination }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
