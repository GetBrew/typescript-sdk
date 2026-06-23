import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Domain } from './types'

/** Body for `PATCH /v1/domains/{domainId}` — the sender defaults. */
export type UpdateDomainSettingsBody =
  components['schemas']['DomainsPatchRequest']

/**
 * Update a domain's sender defaults. The `domainId` selects the row;
 * at least one of `defaultSenderName`, `defaultFromEmail`, or
 * `defaultReplyToEmail` must be supplied.
 */
export type UpdateDomainSettingsInput = {
  domainId: string
} & UpdateDomainSettingsBody

/** Returns the bare updated `Domain` row. */
export type UpdateDomainSettingsResponse = Domain

/**
 * `PATCH /v1/domains/{domainId}` — set the domain's sender defaults
 * (`defaultSenderName`, `defaultFromEmail`, `defaultReplyToEmail`; at
 * least one required). Verification is its own action
 * (`brew.domains.verify`). Returns the bare updated `Domain` row.
 * Requires the `domains` scope.
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
