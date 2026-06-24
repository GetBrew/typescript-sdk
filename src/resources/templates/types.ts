import type { components } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/templates` (`{ data, pagination }`). */
export type TemplatesListResponse =
  components['schemas']['TemplatesListResponse']

/**
 * One template row from the list envelope. Each row now carries the
 * rendered `html` + `previewImage` directly — the single-template
 * `GET /v1/templates/{emailId}` endpoint was removed.
 */
export type Template = TemplatesListResponse['data'][number]
