import type { HttpClient } from '../../core/http'

import { createGetTemplate } from './get'
import { createListTemplates } from './list'

export type TemplatesResource = {
  /** `GET /v1/templates` — list public templates (`{ data, pagination }`, scope: `emails`). */
  readonly list: ReturnType<typeof createListTemplates>
  /** `GET /v1/templates/{emailId}` — fetch one template with `html` + `previewImage` (scope: `emails`). */
  readonly get: ReturnType<typeof createGetTemplate>
}

export function createTemplatesResource(client: HttpClient): TemplatesResource {
  return {
    list: createListTemplates(client),
    get: createGetTemplate(client),
  }
}
