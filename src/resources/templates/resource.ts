import type { HttpClient } from '../../core/http'

import { createListTemplates } from './list'

export type TemplatesResource = {
  /**
   * `GET /v1/templates` — list public templates (`{ data, pagination }`,
   * scope: `emails`). Each row carries the rendered `html` +
   * `previewImage`.
   */
  readonly list: ReturnType<typeof createListTemplates>
}

export function createTemplatesResource(client: HttpClient): TemplatesResource {
  return {
    list: createListTemplates(client),
  }
}
