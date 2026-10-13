import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AppEmailKitBody, AppEmailKitResponse } from './types'

/**
 * Input to `brew.appEmails.setUpKit(...)`, every field optional: `sets`
 * (`auth`, `lifecycle`; default both), `stack` (narrows the auth keys to
 * the ones that library sends and picks its snippets; default `custom`),
 * or exact `keys` instead, plus `domainId` and `overwrite` for every key.
 */
export type SetUpAppEmailKitInput = AppEmailKitBody

export type SetUpAppEmailKitResponse = AppEmailKitResponse

/**
 * Default per-call timeout for `POST /v1/app-emails/kit`.
 *
 * The kit sets up to twelve keys, a few at a time, each exactly as
 * `appEmails.upsert` would, so it routinely outlasts the 30 s client
 * default. The route runs for up to 300 s. Caller-supplied
 * `RequestOptions.timeoutMs` and `RequestOptions.signal` still win.
 *
 * It is a floor, never a cap: a longer client-wide `timeoutMs` is kept.
 */
export const SET_UP_APP_EMAIL_KIT_DEFAULT_TIMEOUT_MS = 300_000

/**
 * `POST /v1/app-emails/kit` (scopes: `automations` and `emails`) — set up
 * the starter kit: the auth emails (verify email, magic link, one-time code, password
 * reset, invite, email change, reauthentication, security notice) and the
 * lifecycle emails (welcome, trial ending, payment failed, win-back).
 *
 * Resolves with `results` in kit order (`ok: true` with the setup result,
 * or `ok: false` with its `error`) and `stack` (`provider`,
 * `authDelivery`, `note`, `keys`, `snippets`). One key failing does not
 * stop the others and does not throw; running the kit again finishes
 * them. Only a refusal of the whole call (auth, validation, rate limit)
 * throws `BrewApiError`.
 *
 * The transport attaches an `Idempotency-Key` (pass your own in
 * `options.idempotencyKey`), so a retried attempt replays instead of
 * running twice. Long-running: the SDK applies a 5-minute default timeout
 * (`SET_UP_APP_EMAIL_KIT_DEFAULT_TIMEOUT_MS`).
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<SetUpAppEmailKitResponse>` instead of the unwrapped body.
 */
export function createSetUpAppEmailKit(client: HttpClient) {
  function setUpAppEmailKit(
    input: SetUpAppEmailKitInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<SetUpAppEmailKitResponse>>
  function setUpAppEmailKit(
    input?: SetUpAppEmailKitInput,
    options?: RequestOptions
  ): Promise<SetUpAppEmailKitResponse>
  async function setUpAppEmailKit(
    input: SetUpAppEmailKitInput = {},
    options?: RequestOptions
  ): Promise<
    SetUpAppEmailKitResponse | BrewRawResponse<SetUpAppEmailKitResponse>
  > {
    const response = await client.request<SetUpAppEmailKitResponse>({
      method: 'POST',
      path: '/v1/app-emails/kit',
      body: input,
      defaultTimeoutMs: SET_UP_APP_EMAIL_KIT_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return setUpAppEmailKit
}
