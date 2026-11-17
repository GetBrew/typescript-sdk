import { unwrapResponse, type HttpClient } from '../../core/http'
import { assertTriggerKey } from '../../core/trigger-key'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AppEmailSetupBody, AppEmailSetupResult } from './types'

/**
 * Input to `brew.appEmails.upsert(...)`: the `triggerKey` your code sends
 * by (it rides the URL path) plus the optional setup body. A starter-kit
 * key alone (`{ triggerKey: 'auth.password-reset' }`) sets up its own
 * starter; your own key takes `starter` (any kit template) or `source`
 * (`{ format: 'html' | 'mjml' | 'jsx', content }`), not both.
 */
export type UpsertAppEmailInput = {
  readonly triggerKey: string
} & AppEmailSetupBody

export type UpsertAppEmailResponse = AppEmailSetupResult

/**
 * Default per-call timeout for `PUT /v1/app-emails/{triggerKey}`.
 *
 * One setup creates or reuses the trigger, imports the design (a `source`
 * runs the same import as `emails.import`), wires the automation and
 * publishes it, so it can outlast the 30 s client default. The route runs
 * for up to 300 s. Caller-supplied `RequestOptions.timeoutMs` and
 * `RequestOptions.signal` still win.
 *
 * It is a floor, never a cap: a longer client-wide `timeoutMs` is kept.
 */
export const UPSERT_APP_EMAIL_DEFAULT_TIMEOUT_MS = 300_000

/**
 * `PUT /v1/app-emails/{triggerKey}` (scopes: `automations` and `emails`,
 * because the setup imports a design) — set up one email your app sends
 * by key, in one idempotent call: the trigger with
 * that key and its payload contract, the design (from a starter or your
 * `source`), an automation that sends it, published unless
 * `publish: false`. Resolves with HTTP 201 when this call set the key up
 * and 200 on a re-run (read it with `{ raw: true }`); `created` says the
 * same per piece.
 *
 * Re-runs change only what differs. A design edited in Brew since setup is
 * kept: the call throws `BrewApiError` `409 APP_EMAIL_EDITED_IN_BREW`
 * until you pass `overwrite: true`. An unknown `starter` is
 * `400 APP_EMAIL_STARTER_UNKNOWN`; a reserved key
 * `400 TRIGGER_KEY_RESERVED`. The sender defaults to a verified domain
 * whose purpose matches the email, else the team-only sandbox
 * (`sender.mode: 'sandbox'`) until one verifies.
 *
 * A PUT carries no `Idempotency-Key`: the route itself is idempotent, so a
 * retried attempt converges on the same setup. Long-running: the SDK
 * applies a 5-minute default timeout (`UPSERT_APP_EMAIL_DEFAULT_TIMEOUT_MS`).
 * An empty key, `.` or `..` throws a `TypeError` before any request.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<UpsertAppEmailResponse>` instead of the unwrapped body.
 */
export function createUpsertAppEmail(client: HttpClient) {
  function upsertAppEmail(
    input: UpsertAppEmailInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<UpsertAppEmailResponse>>
  function upsertAppEmail(
    input: UpsertAppEmailInput,
    options?: RequestOptions
  ): Promise<UpsertAppEmailResponse>
  async function upsertAppEmail(
    input: UpsertAppEmailInput,
    options?: RequestOptions
  ): Promise<UpsertAppEmailResponse | BrewRawResponse<UpsertAppEmailResponse>> {
    const { triggerKey, ...body } = input
    assertTriggerKey(triggerKey, 'appEmails.upsert')
    const response = await client.request<UpsertAppEmailResponse>({
      method: 'PUT',
      path: `/v1/app-emails/${encodeURIComponent(triggerKey)}`,
      body,
      defaultTimeoutMs: UPSERT_APP_EMAIL_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return upsertAppEmail
}
