import type { HttpClient } from '../../core/http'

import { createCreateApiKey } from './create'
import { createListApiKeys } from './list'
import { createRevokeApiKey } from './revoke'

/**
 * The public shape of `brew.apiKeys`. Organization-level: none of these
 * methods send `X-Brand-Id`, even on a brand-pinned client.
 *
 * @deprecated Since the platform restricted `/v1/api-keys*` to an exact
 * `org:admin` Clerk dashboard session (spec `sessionAuth`), this method
 * returns `403` for every API-key or OAuth actor the SDK can authenticate
 * as. Manage keys at https://brew.new/settings/api. Removed in the next
 * major.
 */
export type ApiKeysResource = {
  /**
   * `GET /v1/api-keys` — list keys visible to this credential.
   * @deprecated `403` for API-key / OAuth actors — the route now requires an `org:admin` dashboard session.
   */
  readonly list: ReturnType<typeof createListApiKeys>
  /**
   * `POST /v1/api-keys` — mint a key; the plaintext `key` is returned once.
   * @deprecated `403` for API-key / OAuth actors — the route now requires an `org:admin` dashboard session.
   */
  readonly create: ReturnType<typeof createCreateApiKey>
  /**
   * `DELETE /v1/api-keys/{keyId}` — revoke a key.
   * @deprecated `403` for API-key / OAuth actors — the route now requires an `org:admin` dashboard session.
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
