import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

export type UpdateDomainSettingsBody =
  components['schemas']['DomainsPatchRequest']

export type UpdateDomainSettingsInput = {
  domainId: string
} & UpdateDomainSettingsBody

export type UpdateDomainSettingsResponse = Domain

export function createUpdateDomainSettings(client: HttpClient) {
  function updateDomainSettings(
    input: UpdateDomainSettingsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<UpdateDomainSettingsResponse>>
  function updateDomainSettings(
    input: UpdateDomainSettingsInput,
    options?: RequestOptions
  ): Promise<UpdateDomainSettingsResponse>
  async function updateDomainSettings(
    input: UpdateDomainSettingsInput,
    options?: RequestOptions
  ): Promise<
    UpdateDomainSettingsResponse | BrewRawResponse<UpdateDomainSettingsResponse>
  > {
    const { domainId, ...body } = input
    const response = await client.request<UpdateDomainSettingsResponse>({
      method: 'PATCH',
      path: `/v1/domains/${encodeURIComponent(domainId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateDomainSettings
}
