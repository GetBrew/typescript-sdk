import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { Automation } from './types'

// --------------------------------------------------------------------
// Per-kind config shapes
//
// These mirror the canonical Zod sources in
// `sub-agent-orchestrator/lib/automations/wire-format.ts`. Hand-typed
// (instead of `Extract<components['schemas']['AutomationNode']>`) so
// the SDK's IDE autocomplete shows the right `config` keys when you
// `node.type === 'sendEmail'`.
// --------------------------------------------------------------------

export type AutomationTriggerNodeConfig = {
  /** Optional explicit duplicate of `node.type`. */
  actionType?: string
  /** FK into `triggerEvents` Convex table. */
  triggerEventId?: string
  /** Runtime fallback for the trigger event name. */
  eventName?: string
}

export type AutomationSendEmailNodeConfig = {
  actionType?: string
  /**
   * FK into `emails`. Required. Mint via
   * `brew.emails.generate({ emailType: 'automation' | 'transactional', … })`
   * and reuse the returned `emailId`.
   */
  emailId: string
  /**
   * Pin to a specific `emails.emailVersionId`. Required. The fire
   * runtime loads the EXACT version, so subsequent edits on the
   * same `emailId` don't silently change what the automation sends.
   * Returned alongside `emailId` from `brew.emails.generate(...)`
   * and `brew.emails.edit(...)`.
   */
  emailVersionId: string
  /**
   * FK into the brand's `domains` table. Required — a custom domain
   * is mandatory for API-authored automations. Pick from
   * `brew.domains.list({ … })`.
   */
  domainId: string
  /** Email subject — required. Supports `{{variable | fallback}}` interpolation. */
  subject: string
  /** Preview text — required. Supports interpolation. */
  previewText: string
  /** Sender display name — optional. Resolved from the domain default when unset. */
  fromName?: string
  /** Reply-to address — optional. Resolved from the domain default when unset. */
  replyTo?: string
  /** Pinned `emails._id` — set server-side at publish; round-trips on GET. */
  emailRowId?: string
  emailTitle?: string
  /** RFC-822 from address — derived from `domainId` server-side; round-trips on GET. */
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
      /** Deterministic-RNG seed for tests / replay. */
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

/**
 * Discriminated union of automation graph node inputs — narrows
 * `config` by `type` so SDK callers get per-kind autocomplete.
 *
 * Mirrors `SIMPLE_NODE_SCHEMA` /
 * `lib/automations/wire-format.ts:{trigger,sendEmail,wait,filter,split}ConfigSchema`.
 */
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

/**
 * Deterministic create input — caller supplies the full graph
 * (`nodes`, `connections`) and a `triggerEventId` to bind. Returns
 * the canonical `Automation` row.
 *
 * The public API is deterministic-only — pre-mint email bodies via
 * `brew.emails.generate(...)` and reference the returned `emailId` in
 * `sendEmail.config.emailId`. AI authoring stays on the chat-side
 * orchestrator.
 *
 * Hand-rolled rather than `Extract<>` from the OpenAPI union — see
 * `triggers/create.ts` for the same rationale.
 */
export type CreateAutomationInput = {
  name: string
  description?: string
  triggerEventId: string
  nodes: ReadonlyArray<AutomationNodeInput>
  connections: ReadonlyArray<AutomationConnectionInput>
}

/**
 * `POST /v1/automations` (201) response — the BARE created automation row
 * (draft, full graph). The `200` status is the dry-run validate result. Every
 * other automations read/write (get/patch/publish/unpublish) also returns the
 * bare row, not a `{ automations: [...] }` wrapper.
 */
export type CreateAutomationResponse = Automation

/**
 * `POST /v1/automations` — deterministic create.
 */
export function createCreateAutomation(client: HttpClient) {
  function createAutomation(
    input: CreateAutomationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<CreateAutomationResponse>>
  function createAutomation(
    input: CreateAutomationInput,
    options?: RequestOptions
  ): Promise<CreateAutomationResponse>
  async function createAutomation(
    input: CreateAutomationInput,
    options?: RequestOptions
  ): Promise<
    CreateAutomationResponse | BrewRawResponse<CreateAutomationResponse>
  > {
    const response = await client.request<CreateAutomationResponse>({
      method: 'POST',
      path: '/v1/automations',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return createAutomation
}
