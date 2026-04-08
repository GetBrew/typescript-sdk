import type { components } from '../../generated/openapi-types'
import type { HttpClient } from '../../core/http'
import type { RequestOptions } from '../../types'

import type { FieldsSuccessResponse } from './types'

export type CreateFieldInput = components['schemas']['FieldsPostRequest']

/**
 * Define a new custom field on the contacts schema.
 *
 * Note the wire field names: `fieldName` (not `name`) and `fieldType`
 * (not `type`). The boolean type is `'bool'`, not `'boolean'`. These
 * are pinned to the public API contract.
 *
 * The transport auto-attaches an `Idempotency-Key` header on POST, so
 * retries on transient failures are safe — the API will reject a
 * duplicate create with a `field_already_exists` error rather than
 * duplicating the field.
 *
 * Factory name note: `createCreateField` reads awkwardly, but it keeps
 * the `create<Action><Resource>` factory-naming convention consistent
 * with every other method in the SDK. Consumers never see this symbol —
 * they just call `brew.fields.create(...)`.
 */
export function createCreateField(client: HttpClient) {
  return async (
    input: CreateFieldInput,
    options?: RequestOptions
  ): Promise<FieldsSuccessResponse> => {
    const response = await client.request<FieldsSuccessResponse>({
      method: 'POST',
      path: '/v1/fields',
      body: input,
      ...(options ? { options } : {}),
    })
    return response.data
  }
}
