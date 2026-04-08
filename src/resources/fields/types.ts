/**
 * Shared domain types for the fields resource.
 *
 * Sourced from `src/generated/openapi-types.ts`. Adding a field type or
 * a new field property upstream surfaces here as a tsc error on the
 * next `bun run generate:types`.
 */

import type { components } from '../../generated/openapi-types'

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
export type ContactField =
  components['schemas']['FieldsGetResponse']['fields'][number]

/**
 * Generic success envelope returned by `create` and `delete`. Using a
 * typed envelope (rather than a bare `void` return) keeps the door
 * open for the API to start returning metadata later without breaking
 * consumers.
 */
export type FieldsSuccessResponse =
  components['schemas']['FieldsSuccessResponse']
