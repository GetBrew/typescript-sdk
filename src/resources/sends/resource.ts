import type { HttpClient } from '../../core/http'

import { createCancel } from './cancel'
import { createGetSend } from './get'
import { createListAllSends, createListSends } from './list'
import { createPause } from './pause'
import { createResume } from './resume'

export type SendsResource = {
  readonly list: ReturnType<typeof createListSends>
  readonly listAll: ReturnType<typeof createListAllSends>
  readonly get: ReturnType<typeof createGetSend>
  readonly cancel: ReturnType<typeof createCancel>
  readonly pause: ReturnType<typeof createPause>
  readonly resume: ReturnType<typeof createResume>
}

export function createSendsResource(client: HttpClient): SendsResource {
  return {
    list: createListSends(client),
    listAll: createListAllSends(client),
    get: createGetSend(client),
    cancel: createCancel(client),
    pause: createPause(client),
    resume: createResume(client),
  }
}
