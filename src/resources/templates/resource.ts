import type { HttpClient } from '../../core/http'

import { createGetTemplate } from './get'
import { createListTemplates } from './list'

export type TemplatesResource = {
  /**
   * `GET /v1/templates` — list public templates (`{ data, pagination }`,
   * scope: `emails`). Each row carries the rendered `html` +
   * `previewImage`.
   */
  readonly list: ReturnType<typeof createListTemplates>
  /**
   * `GET /v1/templates/{templateId}` — one template with its
   * `referenceEmailId`; `include: 'html'` adds its rendered content.
   */
  readonly get: ReturnType<typeof createGetTemplate>
}

export function createTemplatesResource(client: HttpClient): TemplatesResource {
  return {
    list: createListTemplates(client),
    get: createGetTemplate(client),
  }
}
