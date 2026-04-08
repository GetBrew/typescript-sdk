/**
 * Shared domain types for the contacts resource.
 *
 * Sourced from `src/generated/openapi-types.ts`. Hand-rolled types are
 * deliberately avoided here — every field, every default, and every
 * optional/required marker comes from the OpenAPI spec so the SDK cannot
 * silently drift from the API.
 *
 * If a name in this file conflicts with what the generator produces (e.g.
 * the generated nested types are anonymous), we wrap it in a stable SDK
 * alias so resource files import a clean name and the generated location
 * stays an implementation detail of this module.
 */

import type { components, paths } from '../../generated/openapi-types'

/**
 * A Brew contact as returned by the public API.
 *
 * Note: `createdAt` and `updatedAt` are UNIX millisecond timestamps
 * (`number`), NOT ISO strings. Convert with `new Date(contact.createdAt)`
 * if you need a Date object.
 */
export type Contact = components['schemas']['ContactsLookupResponse']['contact']

/**
 * Arbitrary key/value pairs attached to a contact. Values are typed as
 * `unknown` because the Brew API accepts strings, numbers, booleans,
 * arrays, and nested objects as custom-field values — callers narrow
 * when they read specific fields.
 */
export type ContactCustomFields = Contact['customFields']

/**
 * Filter object for `list` and `count`. Uses the OpenAPI `deepObject`
 * style: keys are field names (use dotted notation for custom fields like
 * `'customFields.plan'`), values are either a string shorthand or an
 * `{ operator: value }` object.
 *
 * Supported operator names per the Brew API server:
 *   equals, not_equals, contains, not_contains, contains_any,
 *   not_contains_any, starts_with, ends_with, is_empty, is_not_empty,
 *   in, not_in, exists, not_exists
 *
 * The OpenAPI type is intentionally permissive (`[key: string]`) so
 * the SDK does not type-check the operator name. A typo like `eq`
 * instead of `equals` will compile fine but the server will 400. See
 * `docs/contacts.md` for the source-of-truth operator list.
 *
 * Examples:
 *
 * ```ts
 * // Shorthand equality
 * { subscribed: 'true' }
 *
 * // Explicit operator
 * { 'customFields.plan': { equals: 'enterprise' } }
 *
 * // Multi-clause with logic
 * {
 *   _logic: 'and',
 *   subscribed: 'true',
 *   'customFields.plan': { equals: 'enterprise' },
 * }
 * ```
 *
 * Sourced from the generated operation parameters so any spec change
 * to the filter shape will surface as a tsc error here.
 */
export type ContactsFilter = NonNullable<
  NonNullable<paths['/v1/contacts']['get']['parameters']['query']>['filter']
>
