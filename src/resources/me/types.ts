import type { components } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/me`. */
export type MeGetResponse = components['schemas']['MeGetResponse']

/** How the caller authenticated (`api_key` for keys, `session` for cookies). */
export type MeAuthType = MeGetResponse['authType']
