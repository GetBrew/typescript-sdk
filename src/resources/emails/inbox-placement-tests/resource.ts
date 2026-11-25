import type { HttpClient } from '../../../core/http'

import { createCreateInboxPlacementTest } from './create'
import { createGetInboxPlacementTest } from './get'
import { createListInboxPlacementTests } from './list'

export type InboxPlacementTestsResource = {
  readonly create: ReturnType<typeof createCreateInboxPlacementTest>
  readonly list: ReturnType<typeof createListInboxPlacementTests>
  readonly get: ReturnType<typeof createGetInboxPlacementTest>
}

export function createInboxPlacementTestsResource(
  client: HttpClient
): InboxPlacementTestsResource {
  return {
    create: createCreateInboxPlacementTest(client),
    list: createListInboxPlacementTests(client),
    get: createGetInboxPlacementTest(client),
  }
}
