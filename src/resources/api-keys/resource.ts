import type { HttpClient } from '../../core/http'

import { createCreateApiKey } from './create'
import { createListApiKeys } from './list'
import { createRevokeApiKey } from './revoke'

/**
 * @deprecated
 */
export type ApiKeysResource = {
  /**
   * @deprecated
   */
  readonly list: ReturnType<typeof createListApiKeys>
  /**
   * @deprecated
   */
  readonly create: ReturnType<typeof createCreateApiKey>
  /**
   * @deprecated
   */
  readonly revoke: ReturnType<typeof createRevokeApiKey>
}

export function createApiKeysResource(client: HttpClient): ApiKeysResource {
  return {
    list: createListApiKeys(client),
    create: createCreateApiKey(client),
    revoke: createRevokeApiKey(client),
  }
}
