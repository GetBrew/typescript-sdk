import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

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
 * retries on transient failures are safe. `POST /v1/fields` is upsert-
 * shaped: a duplicate create for the same `fieldName` resolves with
 * `{ success: true }` instead of throwing, so this method is safe to
 * call lazily to ensure a custom field exists. The only validation
 * failure surfaced as a `BrewApiError` is `422 CORE_FIELD_IMMUTABLE`
 * (when `fieldName` collides with a built-in core field).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<FieldsSuccessResponse>` instead of the unwrapped
 * payload.
 *
 * Factory name note: `createCreateField` reads awkwardly, but it keeps
 * the `create<Action><Resource>` factory-naming convention consistent
 * with every other method in the SDK. Consumers never see this symbol —
 * they just call `brew.fields.create(...)`.
 */
export function createCreateField(client: HttpClient) {
  function create(
    input: CreateFieldInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<FieldsSuccessResponse>>
  function create(
    input: CreateFieldInput,
    options?: RequestOptions
  ): Promise<FieldsSuccessResponse>
  async function create(
    input: CreateFieldInput,
    options?: RequestOptions
  ): Promise<FieldsSuccessResponse | BrewRawResponse<FieldsSuccessResponse>> {
    const response = await client.request<FieldsSuccessResponse>({
      method: 'POST',
      path: '/v1/fields',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return create
}
