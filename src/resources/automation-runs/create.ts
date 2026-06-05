import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  AutomationRunsPostResponse,
  FireTriggerResponse,
  TestRunResponse,
} from './types'

/**
 * Discriminated body union for `POST /v1/automation/runs`. Hand-rolled
 * so the per-branch shape is preserved at the type level — the
 * generated OpenAPI types collapse union branches into a single
 * object.
 */
export type AutomationRunsPostInput =
  | {
      triggerEventId: string
      payload: Record<string, unknown>
      idempotencyKey?: string
    }
  | {
      automationId: string
      mode: 'test'
      payload?: Record<string, unknown>
    }
  | {
      automationRunId: string
      mode: 'replay'
    }

/**
 * Raw `POST /v1/automation/runs` — body is a 3-branch union (fire /
 * test / replay). Prefer the sugar methods (`fire`, `test`, `replay`)
 * which narrow the body shape per branch.
 */
export function createPostAutomationRun(client: HttpClient) {
  function postAutomationRun(
    input: AutomationRunsPostInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AutomationRunsPostResponse>>
  function postAutomationRun(
    input: AutomationRunsPostInput,
    options?: RequestOptions
  ): Promise<AutomationRunsPostResponse>
  async function postAutomationRun(
    input: AutomationRunsPostInput,
    options?: RequestOptions
  ): Promise<
    AutomationRunsPostResponse | BrewRawResponse<AutomationRunsPostResponse>
  > {
    const response = await client.request<AutomationRunsPostResponse>({
      method: 'POST',
      path: '/v1/automation/runs',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return postAutomationRun
}

export type FireTriggerInput = {
  triggerEventId: string
  payload: Record<string, unknown>
  /**
   * Idempotency token (preferred via the `Idempotency-Key` header
   * on the underlying request). Retries with the same key replay
   * the original `automationRunIds` instead of starting duplicate
   * runs.
   */
  idempotencyKey?: string
}

/**
 * Fire a trigger. Returns the fire envelope — read started run ids from
 * `result.details.automationRunIds`.
 */
export function createFireTrigger(
  postAutomationRun: ReturnType<typeof createPostAutomationRun>
) {
  return async function fireTrigger(
    input: FireTriggerInput,
    options?: RequestOptions
  ): Promise<FireTriggerResponse> {
    return (await postAutomationRun(input, options)) as FireTriggerResponse
  }
}

export type TestAutomationInput = {
  automationId: string
  payload?: Record<string, unknown>
}

/**
 * Test-fire a saved automation (no real mail sent).
 */
export function createTestAutomation(
  postAutomationRun: ReturnType<typeof createPostAutomationRun>
) {
  return async function testAutomation(
    input: TestAutomationInput,
    options?: RequestOptions
  ): Promise<TestRunResponse> {
    return (await postAutomationRun(
      { ...input, mode: 'test' },
      options
    )) as TestRunResponse
  }
}

export type ReplayAutomationRunInput = {
  automationRunId: string
}

/** Replay-branch response — flat envelope with `status: 'replay_started'`. */
export type ReplayRunResponse = TestRunResponse

/**
 * Replay a prior automation run. Re-runs it with the SAME trigger
 * payload + mode against the automation's CURRENT saved draft, minting
 * one brand-new run (workflow runs are terminal, so replay is never a
 * resume). Idempotency is supported via `options.idempotencyKey`.
 *
 * Returns `202 { status: 'replay_started', automationRunIds: [newRunId],
 * receivedAt, warnings? }`. An unknown or cross-brand `automationRunId`
 * is a `404 AUTOMATION_RUN_NOT_FOUND`.
 */
export function createReplayAutomationRun(
  postAutomationRun: ReturnType<typeof createPostAutomationRun>
) {
  return async function replayAutomationRun(
    input: ReplayAutomationRunInput,
    options?: RequestOptions
  ): Promise<ReplayRunResponse> {
    return (await postAutomationRun(
      {
        automationRunId: input.automationRunId,
        mode: 'replay',
      },
      options
    )) as ReplayRunResponse
  }
}
