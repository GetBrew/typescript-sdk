/**
 * Shared domain types for the fields resource.
 *
 * Sourced from `src/generated/openapi-types.ts`. Adding a field type or
 * a new field property upstream surfaces here as a tsc error on the
 * next `bun run generate:types`.
 */

import type { components, operations } from '../../generated/openapi-types'

/**
 * Supported custom-field types on contacts. Pinned to the OpenAPI enum.
 *
 * Note: the API uses `'bool'` (not `'boolean'`) for the boolean field
 * type, and there is no `'array'` type — this is the wire vocabulary,
 * mirror it exactly.
 */
export type ContactFieldType =
  components['schemas']['FieldsPostRequest']['fieldType']

/**
 * A custom-field definition attached to the contacts schema. Each
 * field has a stable `fieldName` (the key used inside `customFields`),
 * a `fieldType`, and optional metadata flags describing whether the
 * field can be filtered, sorted, or searched.
 */
export type ContactField = components['schemas']['ContactFieldDefinition']

/** Envelope returned by `GET /v1/fields` — `{ data, pagination }`. */
export type FieldsGetResponse = components['schemas']['FieldsGetResponse']

/** Opaque cursor pagination block on the list envelope. */
export type FieldsPagination = FieldsGetResponse['pagination']

/**
 * Response from `POST /v1/fields` — the bare created/updated field
 * definition (201), no wrapping envelope.
 */
export type CreateFieldResponse =
  components['schemas']['ContactFieldDefinition']

/**
 * Response from `DELETE /v1/fields/{fieldName}` — `{ fieldName, deleted }`.
 * Idempotent: deleting an unknown field resolves with `deleted: false`.
 */
export type FieldsDeleteResponse =
  components['schemas']['FieldsDeleteResponse']

/** Query params accepted by `brew.fields.list(...)` (`limit`, `cursor`). */
export type ListFieldsInput = NonNullable<
  operations['listContactFields']['parameters']['query']
>
