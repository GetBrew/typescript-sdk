/**
 * Shared domain types for the fields resource.
 *
 * TODO(openapi): Hand-rolled for now. Replace with re-exports from
 * `src/generated/openapi-types.ts` when the openapi-typescript pipeline
 * is wired up.
 */

/**
 * Supported custom-field types on contacts. Keep this in sync with the
 * public API contract — adding a type here without server support will
 * let callers write code that 422s at runtime.
 */
export type ContactFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'

/**
 * A custom-field definition attached to the contacts schema.
 */
export type ContactField = {
  readonly name: string
  readonly type: ContactFieldType
  readonly createdAt?: string
}

/**
 * Generic success envelope returned by endpoints that have nothing
 * meaningful to say beyond "it worked". Using a typed envelope (rather
 * than a bare `void` return) keeps the door open for the API to start
 * returning metadata later without breaking consumers.
 */
export type FieldsSuccessResponse = {
  readonly success: true
}
