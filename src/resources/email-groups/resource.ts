import type { HttpClient } from '../../core/http'

import { createCreateEmailGroup } from './create'
import { createDeleteEmailGroup } from './delete'
import { createGetEmailGroup } from './get'
import { createListEmailGroups } from './list'
import { createUpdateEmailGroup } from './update'

export type EmailGroupsResource = {
  readonly list: ReturnType<typeof createListEmailGroups>
  readonly get: ReturnType<typeof createGetEmailGroup>
  readonly create: ReturnType<typeof createCreateEmailGroup>
  readonly update: ReturnType<typeof createUpdateEmailGroup>
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
