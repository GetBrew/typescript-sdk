import type { ContactsFilter } from './types'

/**
 * Flatten a `ContactsFilter` deep-object into bracket-notation query keys
 * the way OpenAPI's `deepObject` style + `explode: true` requires.
 *
 * The Brew API accepts filters as `filter[<field>]=<value>` for the
 * shorthand form and `filter[<field>][<op>]=<value>` for the explicit
 * operator form. URLSearchParams encodes the brackets to `%5B`/`%5D`,
 * which the server URL-decodes back before parsing — both forms wire
 * across cleanly.
 *
 * Returns a flat record so the resource layer can spread it into the
 * existing `query` parameter on `HttpRequestInput` without the transport
 * having to learn about deep-object serialization.
 */
export function flattenFilter(filter: ContactsFilter): Record<string, string> {
  const flat: Record<string, string> = {}

  for (const [field, value] of Object.entries(filter)) {
    if (value === undefined) continue

    if (typeof value === 'string') {
      flat[`filter[${field}]`] = value
      continue
    }

    if (typeof value === 'object' && value !== null) {
      for (const [operator, operatorValue] of Object.entries(value)) {
        if (operatorValue === undefined) continue
        flat[`filter[${field}][${operator}]`] = String(operatorValue)
      }
    }
  }

  return flat
}
