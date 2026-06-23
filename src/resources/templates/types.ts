import type { components } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/templates` (`{ data, pagination }`). */
export type TemplatesListResponse =
  components['schemas']['TemplatesListResponse']

/** One lean template row from the list envelope (`{ emailId, … }`). */
export type Template = TemplatesListResponse['data'][number]

/** A single template with rendered `html` + `previewImage` (`GET /v1/templates/{emailId}`). */
export type TemplateDetail = components['schemas']['Template']
