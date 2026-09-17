import type { HttpClient } from '../../../core/http'

import { createCreateInboxPlacementTest } from './create'
import { createGetInboxPlacementTest } from './get'
import { createListInboxPlacementTests } from './list'

export type InboxPlacementTestsResource = {
  /** `POST /v1/emails/{emailId}/inbox-placement-tests` — seed-list test of where the design LANDS (inbox vs spam vs missing) across real providers; returns `202` with `status: 'queued'`, fixed 10 credits (scope: `emails`). */
  readonly create: ReturnType<typeof createCreateInboxPlacementTest>
  /** `GET /v1/emails/{emailId}/inbox-placement-tests` — the design's recent tests as lean rows; FREE (scope: `emails`). */
  readonly list: ReturnType<typeof createListInboxPlacementTests>
  /** `GET /v1/emails/{emailId}/inbox-placement-tests/{testId}` — poll ONE test as the bare row until it is `completed`; FREE (scope: `emails`). */
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
