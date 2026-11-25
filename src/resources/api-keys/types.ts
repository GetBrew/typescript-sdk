import type { components } from '../../generated/openapi-types'

export type ApiKeysListResponse = components['schemas']['ApiKeysListResponse']

export type ApiKey = ApiKeysListResponse['data'][number]

export type CreateApiKeyInput = components['schemas']['ApiKeysCreateRequest']

export type CreateApiKeyResponse =
  components['schemas']['ApiKeysCreateResponse']

export type RevokeApiKeyInput = {
  readonly keyId: string
}

export type RevokeApiKeyResponse =
  components['schemas']['ApiKeysDeleteResponse']
