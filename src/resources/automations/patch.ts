import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AutomationConnectionInput, AutomationNodeInput } from './create'
import type { Automation, AutomationDryRunReport } from './types'

export type PatchAutomationInput = {
  automationId: string
  name?: string
  description?: string
  nodes?: ReadonlyArray<AutomationNodeInput>
  connections?: ReadonlyArray<AutomationConnectionInput>
  triggerEventId?: string
  dryRun?: boolean
  published?: boolean
  automationVersionId?: string
  stopInFlight?: boolean
  paused?: boolean
  expectedBaseVersionId?: string
  expectedBaseDefinitionSha256?: string
}

export type PatchAutomationDryRunInput = Omit<
  PatchAutomationInput,
  'dryRun'
> & {
  dryRun: true
}

export type PatchAutomationResponse = Automation

export function createPatchAutomation(client: HttpClient) {
  function patchAutomation(
    input: PatchAutomationDryRunInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AutomationDryRunReport>>
  function patchAutomation(
    input: PatchAutomationDryRunInput,
    options?: RequestOptions
  ): Promise<AutomationDryRunReport>
  function patchAutomation(
    input: PatchAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchAutomationResponse>>
  function patchAutomation(
    input: PatchAutomationInput,
    options?: RequestOptions
  ): Promise<PatchAutomationResponse>
  async function patchAutomation(
    input: PatchAutomationInput | PatchAutomationDryRunInput,
    options?: RequestOptions
  ): Promise<
    | PatchAutomationResponse
    | AutomationDryRunReport
    | BrewRawResponse<PatchAutomationResponse | AutomationDryRunReport>
  > {
    const { automationId, ...body } = input
    const response = await client.request<
      PatchAutomationResponse | AutomationDryRunReport
    >({
      method: 'PATCH',
      path: `/v1/automations/${encodeURIComponent(automationId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return patchAutomation
}

export function createPublishAutomation(client: HttpClient) {
  function publishAutomation(
    input: { automationId: string; automationVersionId?: string },
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchAutomationResponse>>
  function publishAutomation(
    input: { automationId: string; automationVersionId?: string },
    options?: RequestOptions
  ): Promise<PatchAutomationResponse>
  async function publishAutomation(
    input: { automationId: string; automationVersionId?: string },
    options?: RequestOptions
  ): Promise<
    PatchAutomationResponse | BrewRawResponse<PatchAutomationResponse>
  > {
    const body: { published: true; automationVersionId?: string } = {
      published: true,
      ...(input.automationVersionId
        ? { automationVersionId: input.automationVersionId }
        : {}),
    }
    const response = await client.request<PatchAutomationResponse>({
      method: 'PATCH',
      path: `/v1/automations/${encodeURIComponent(input.automationId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return publishAutomation
}

export type UnpublishAutomationInput = {
  readonly automationId: string
  readonly stopInFlight?: boolean
}

export function createUnpublishAutomation(client: HttpClient) {
  function unpublishAutomation(
    input: UnpublishAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<PatchAutomationResponse>>
  function unpublishAutomation(
    input: UnpublishAutomationInput,
    options?: RequestOptions
  ): Promise<PatchAutomationResponse>
  async function unpublishAutomation(
    input: UnpublishAutomationInput,
    options?: RequestOptions
  ): Promise<
    PatchAutomationResponse | BrewRawResponse<PatchAutomationResponse>
  > {
    const body: { published: false; stopInFlight?: boolean } = {
      published: false,
      ...(input.stopInFlight !== undefined
        ? { stopInFlight: input.stopInFlight }
        : {}),
    }
    const response = await client.request<PatchAutomationResponse>({
      method: 'PATCH',
      path: `/v1/automations/${encodeURIComponent(input.automationId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return unpublishAutomation
}
