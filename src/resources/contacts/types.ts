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

import type { components } from '../../generated/openapi-types'

/**
 * A Brew contact as returned by the public API — core columns,
 * suppression state, and `customFields`.
 *
 * Note: `createdAt` and `updatedAt` are ISO-8601 date-time strings.
 * Convert with `new Date(contact.createdAt)` if you need a Date object.
 *
 * Sourced from the top-level `Contact` schema, which `GET
 * /v1/contacts/{email}` returns bare and the list / search pages return
 * as each element of `data[]`.
 */
export type Contact = components['schemas']['Contact']

/**
 * Arbitrary key/value pairs attached to a contact. Values are typed as
 * `unknown` because the Brew API accepts strings, numbers, booleans,
 * arrays, and nested objects as custom-field values — callers narrow
 * when they read specific fields.
 */
export type ContactCustomFields = Contact['customFields']

/**
 * One typed filter clause for `search` / `count`. Filtering moved off the
 * `GET /v1/contacts` query string onto `POST /v1/contacts/search`, which
 * carries a flat `filters` array combined by `logic` instead of the old
 * deep-object query style.
 *
 * `field` is a core column (`subscribed`, `firstName`, …) or a custom
 * field (e.g. `'customFields.plan'`). `operator` is one of the Brew
 * server's predicate names — the spec types it as a bare `string`, so a
 * typo like `eq` instead of `equals` compiles but the server returns
 * `400`. See `docs/contacts.md` for the source-of-truth operator list.
 *
 * Example:
 *
 * ```ts
 * { field: 'customFields.plan', operator: 'equals', value: 'enterprise' }
 * ```
 */
export type ContactsFilter =
  components['schemas']['ContactsSearchRequest']['filters'][number]
