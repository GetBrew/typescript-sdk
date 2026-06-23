import type { components } from '../../generated/openapi-types'

/**
 * A single sending-domain row — `status`, the derived `sendable` flag,
 * and the full DNS `records` array. Returned bare by `add`, `get`,
 * `verify`, and `updateSettings`, and as each element of the
 * `list` / `listSendable` `{ data, pagination }` envelope.
 */
export type Domain = components['schemas']['Domain']
