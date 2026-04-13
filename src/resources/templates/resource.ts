import type { HttpClient } from '../../core/http'

import { createListTemplates } from './list'

export type TemplatesResource = {
  readonly list: ReturnType<typeof createListTemplates>
}

export function createTemplatesResource(client: HttpClient): TemplatesResource {
  return {
    list: createListTemplates(client),
  }
}
