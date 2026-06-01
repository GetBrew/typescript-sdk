import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { ListDomainsResponse } from './list'

/**
 * Update a domain's sender defaults. At least one of `defaultSenderName`,
 * `defaultFromEmail`, or `defaultReplyToEmail` must be supplied.
 */
export type UpdateDomainSettingsInput = {
  domainId: string
  defaultSenderName?: string
  defaultFromEmail?: string
  defaultReplyToEmail?: string
}

export type UpdateDomainSettingsResponse = ListDomainsResponse

/**
 * `PATCH /v1/domains { domainId, default*… }` — set the domain's sender
 * defaults. Returns the uniform `{ domains: [row] }` envelope.
 */
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
    const response = await client.request<UpdateDomainSettingsResponse>({
      method: 'PATCH',
      path: '/v1/domains',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return updateDomainSettings
}
