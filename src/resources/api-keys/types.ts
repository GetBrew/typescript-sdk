import type { components } from '../../generated/openapi-types'

/**
 * Envelope returned by `GET /v1/api-keys` — `{ data }` (unpaginated).
 * Organization-level: a brand-scoped credential only sees keys bound to
 * its own brand.
 */
export type ApiKeysListResponse = components['schemas']['ApiKeysListResponse']

/**
 * One API key row visible to this credential. `brandId` is the key's
 * binding (omitted for organization-wide keys), not the request actor.
 * Never carries the plaintext secret — only `keyPreview`.
 */
export type ApiKey = ApiKeysListResponse['data'][number]

/**
 * Body of `POST /v1/api-keys`. `brandId` is the NEW key's binding (omit
 * for an organization-wide key) — the only v1 body field named
 * `brandId`. `permissions` defaults to `["all"]` and cannot exceed the
 * caller's own grant.
 */
export type CreateApiKeyInput = components['schemas']['ApiKeysCreateRequest']

/**
 * `201` response from `POST /v1/api-keys` — `{ key, keyId, message }`.
 * `key` is the plaintext secret, shown exactly once; store it
 * immediately, it cannot be read back later.
 */
export type CreateApiKeyResponse =
  components['schemas']['ApiKeysCreateResponse']

/** Input to `brew.apiKeys.revoke(...)` — the key to revoke. */
export type RevokeApiKeyInput = {
  /** API key id returned by `GET /v1/api-keys` or `POST /v1/api-keys`. */
  readonly keyId: string
}

/** Response from `DELETE /v1/api-keys/{keyId}` — `{ keyId, revoked }`. */
export type RevokeApiKeyResponse =
  components['schemas']['ApiKeysDeleteResponse']
