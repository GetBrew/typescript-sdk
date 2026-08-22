import type { HttpClient } from '../../core/http'

import { createCreateApiKey } from './create'
import { createListApiKeys } from './list'
import { createRevokeApiKey } from './revoke'

/**
 * The public shape of `brew.apiKeys`. Organization-level: none of these
 * methods send `X-Brand-Id`, even on a brand-pinned client.
 */
export type ApiKeysResource = {
  /** `GET /v1/api-keys` — list keys visible to this credential (brand-filtered for brand-scoped credentials). No permission scope. */
  readonly list: ReturnType<typeof createListApiKeys>
  /** `POST /v1/api-keys` — mint a key; the plaintext `key` is returned once. No permission scope. */
  readonly create: ReturnType<typeof createCreateApiKey>
  /** `DELETE /v1/api-keys/{keyId}` — revoke a key. No permission scope. */
  readonly revoke: ReturnType<typeof createRevokeApiKey>
}

export function createApiKeysResource(client: HttpClient): ApiKeysResource {
  return {
    list: createListApiKeys(client),
    create: createCreateApiKey(client),
    revoke: createRevokeApiKey(client),
  }
}
