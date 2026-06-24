import type { components } from '../../generated/openapi-types'

/**
 * A single sending-domain row — `status`, the derived `sendable` flag,
 * and the full DNS `records` array. Returned bare by `add`, `verify`,
 * and `updateSettings`, and as each element of the `list`
 * `{ data, pagination? }` envelope (both list mode and the single-row
 * detail page).
 */
export type Domain = components['schemas']['Domain']
