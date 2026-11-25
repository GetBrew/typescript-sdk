import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Automation, AutomationDryRunReport } from './types'

export type AutomationTriggerNodeConfig = {
  actionType?: string
  triggerEventId?: string
  eventName?: string
}

export type AutomationSendEmailNodeConfig = {
  actionType?: string
  emailId: string
  emailVersionId: string
  domainId: string
  subject: string
  previewText: string
  fromName?: string
  replyTo?: string
  emailRowId?: string
  emailTitle?: string
  fromAddress?: string
}

export type AutomationWaitNodeConfig = {
  actionType?: string
  duration: number
  unit: 'minutes' | 'hours' | 'days' | 'weeks'
}

export type AutomationFilterCondition = {
  field: string
  operator: string
  value?: string | number | boolean
}

export type AutomationFilterNodeConfig = {
  actionType?: string
  logicalOperator: 'AND' | 'OR'
  conditions: ReadonlyArray<AutomationFilterCondition>
}

export type AutomationSplitNodeConfig =
  | {
      actionType?: string
      mode: 'percentage'
      leftLabel: string
      rightLabel: string
      leftPercentage: number
      seed?: string
    }
  | {
      actionType?: string
      mode: 'condition'
      leftLabel: string
      rightLabel: string
      logicalOperator: 'AND' | 'OR'
      conditions: ReadonlyArray<AutomationFilterCondition>
    }

type AutomationNodeBase = {
  id: string
  label: string
  description?: string
}

export type AutomationNodeInput =
  | (AutomationNodeBase & {
      type: 'trigger'
      config: AutomationTriggerNodeConfig
    })
  | (AutomationNodeBase & {
      type: 'sendEmail'
      config: AutomationSendEmailNodeConfig
    })
  | (AutomationNodeBase & { type: 'wait'; config: AutomationWaitNodeConfig })
  | (AutomationNodeBase & {
      type: 'filter'
      config: AutomationFilterNodeConfig
    })
  | (AutomationNodeBase & { type: 'split'; config: AutomationSplitNodeConfig })

export type AutomationConnectionInput = {
  from: string
  to: string
  branch?: 'left' | 'right'
}

export type CreateAutomationInput = {
  name: string
  description?: string
  triggerEventId: string
  nodes: ReadonlyArray<AutomationNodeInput>
  connections: ReadonlyArray<AutomationConnectionInput>
  dryRun?: false
}

export type CreateAutomationDryRunInput = Omit<
  CreateAutomationInput,
  'dryRun'
> & {
  dryRun: true
}

export type CreateAutomationResponse = Automation

export function createCreateAutomation(client: HttpClient) {
  function createAutomation(
    input: CreateAutomationDryRunInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AutomationDryRunReport>>
  function createAutomation(
    input: CreateAutomationDryRunInput,
    options?: RequestOptions
  ): Promise<AutomationDryRunReport>
  function createAutomation(
    input: CreateAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateAutomationResponse>>
  function createAutomation(
    input: CreateAutomationInput,
    options?: RequestOptions
  ): Promise<CreateAutomationResponse>
  async function createAutomation(
    input: CreateAutomationInput | CreateAutomationDryRunInput,
    options?: RequestOptions
  ): Promise<
    | CreateAutomationResponse
    | AutomationDryRunReport
    | BrewRawResponse<CreateAutomationResponse | AutomationDryRunReport>
  > {
    const response = await client.request<
      CreateAutomationResponse | AutomationDryRunReport
    >({
      method: 'POST',
      path: '/v1/automations',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createAutomation
}
