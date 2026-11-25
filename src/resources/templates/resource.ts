import type { HttpClient } from '../../core/http'

import { createGetTemplate } from './get'
import { createListTemplates } from './list'

export type TemplatesResource = {
  readonly list: ReturnType<typeof createListTemplates>
  readonly get: ReturnType<typeof createGetTemplate>
}

export function createTemplatesResource(client: HttpClient): TemplatesResource {
  return {
    list: createListTemplates(client),
    get: createGetTemplate(client),
  }
}
