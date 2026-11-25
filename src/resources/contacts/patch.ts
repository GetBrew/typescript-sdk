import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ContactConsentInput } from './types'

export type PatchContactInput = {
  readonly email: string
} & (
  | {
      readonly fields: { readonly [key: string]: unknown }
      readonly consent?: ContactConsentInput
    }
  | {
      readonly fields?: { readonly [key: string]: unknown }
      readonly consent: ContactConsentInput
    }
)

export type PatchContactResponse =
  components['schemas']['ContactsPatchResponse']

export function createPatchContact(client: HttpClient) {
  function patch(
    input: PatchContactInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchContactResponse>>
  function patch(
    input: PatchContactInput,
    options?: RequestOptions
  ): Promise<PatchContactResponse>
  async function patch(
    input: PatchContactInput,
    options?: RequestOptions
  ): Promise<PatchContactResponse | BrewRawResponse<PatchContactResponse>> {
    const response = await client.request<PatchContactResponse>({
      method: 'PATCH',
      path: `/v1/contacts/${encodeURIComponent(input.email)}`,
      body: {
        ...(input.fields === undefined ? {} : { fields: input.fields }),
        ...(input.consent === undefined ? {} : { consent: input.consent }),
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return patch
}
