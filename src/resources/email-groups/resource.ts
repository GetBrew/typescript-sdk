import type { HttpClient } from '../../core/http'

import { createCreateEmailGroup } from './create'
import { createDeleteEmailGroup } from './delete'
import { createGetEmailGroup } from './get'
import { createListEmailGroups } from './list'
import { createUpdateEmailGroup } from './update'

/**
 * The public shape of `brew.emailGroups`. Named folders for organizing
 * email designs — every design belongs to exactly one group, defaulting
 * to the `ungrouped` sentinel.
 */
export type EmailGroupsResource = {
  /** `GET /v1/email-groups` — every folder for the brand, plus the `ungrouped` sentinel (scope: `emails`). */
  readonly list: ReturnType<typeof createListEmailGroups>
  /** `GET /v1/email-groups/{groupId}` — one folder as the bare row (scope: `emails`). */
  readonly get: ReturnType<typeof createGetEmailGroup>
  /** `POST /v1/email-groups` — create a named folder (scope: `emails`). */
  readonly create: ReturnType<typeof createCreateEmailGroup>
  /** `PATCH /v1/email-groups/{groupId}` — rename a folder (scope: `emails`). */
  readonly update: ReturnType<typeof createUpdateEmailGroup>
  /** `DELETE /v1/email-groups/{groupId}` — idempotent remove; members move to Ungrouped (scope: `emails`). */
  readonly delete: ReturnType<typeof createDeleteEmailGroup>
}

export function createEmailGroupsResource(
  client: HttpClient
): EmailGroupsResource {
  return {
    list: createListEmailGroups(client),
    get: createGetEmailGroup(client),
    create: createCreateEmailGroup(client),
    update: createUpdateEmailGroup(client),
    delete: createDeleteEmailGroup(client),
  }
}
