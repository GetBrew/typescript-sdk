/**
 * Shared domain types for the contacts resource.
 *
 * TODO(openapi): These are hand-rolled from the plan doc + public API
 * behavior. Once `openapi/public-api-v1.yaml` lands in the repo and the
 * `openapi-typescript` generator script is wired up, these should be
 * replaced with re-exports from `src/generated/openapi-types.ts`. Keep the
 * method-facing names stable so resource files don't churn.
 */

/**
 * Arbitrary key/value pairs attached to a contact. Values are typed as
 * `unknown` because the Brew API accepts strings, numbers, booleans,
 * arrays, and nested objects as custom-field values — callers are
 * expected to narrow when they read specific fields.
 */
export type ContactCustomFields = Readonly<Record<string, unknown>>

/**
 * A Brew contact as returned by the public API. The email is the stable
 * identifier; every other field may be absent on read.
 */
export type Contact = {
  readonly email: string
  readonly firstName?: string
  readonly lastName?: string
  readonly customFields?: ContactCustomFields
  readonly createdAt?: string
  readonly updatedAt?: string
}

/**
 * Operators supported by Brew's filter language. Mirrors the public
 * contract — if the contract grows new operators, add them here and the
 * SDK type system will force call sites to stay in sync.
 */
export type ContactFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'exists'

/**
 * A single filter predicate. `field` uses dotted notation for custom
 * fields (e.g. `customFields.plan`). `value` is `unknown` for the same
 * reason `ContactCustomFields` values are — the API accepts heterogeneous
 * value types per operator.
 */
export type ContactFilter = {
  readonly field: string
  readonly operator: ContactFilterOperator
  readonly value: unknown
}
