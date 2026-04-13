import type { HttpClient } from '../../core/http'

import { createCreateSend } from './create'

export type SendsResource = {
  readonly create: ReturnType<typeof createCreateSend>
}

export function createSendsResource(client: HttpClient): SendsResource {
  return {
    create: createCreateSend(client),
  }
}
