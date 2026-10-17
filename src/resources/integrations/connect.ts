import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import { assertConnectionProvider } from './provider'
import type {
  IntegrationConnectionBody,
  IntegrationConnectionProvider,
  IntegrationConnectionResult,
} from './types'

/**
 * Input to `brew.integrations.connect(...)`: the hosted auth hook
 * `provider` (it rides the URL path) plus the body: the `signingSecret`
 * the provider signs deliveries with and, for Supabase only,
 * `settings.projectUrl`.
 */
export type ConnectIntegrationInput = {
  readonly provider: IntegrationConnectionProvider
} & IntegrationConnectionBody

export type ConnectIntegrationResponse = IntegrationConnectionResult

/**
 * Default per-call timeout for `PUT /v1/integrations/{provider}/connection`.
 *
 * A connect also sets up the provider's auth app emails, each importing
 * and rendering a design, so it can outlast the 30 s client default. The
 * route runs for up to 300 s. Caller-supplied `RequestOptions.timeoutMs`
 * and `RequestOptions.signal` still win.
 *
 * It is a floor, never a cap: a longer client-wide `timeoutMs` is kept.
 */
export const CONNECT_INTEGRATION_DEFAULT_TIMEOUT_MS = 300_000

/**
 * `PUT /v1/integrations/{provider}/connection` (scopes: `emails` and
 * `automations`, because the call also runs the app email kit) — connect a
 * hosted auth email hook for the brand, so the provider hands every auth
 * email to Brew: the Supabase Auth Send Email Hook (`supabase_auth`) or
 * Clerk's `email.created` (`clerk`). It also sets up the auth app emails
 * that provider sends.
 *
 * Resolves with `provider`, `connectionId`, the `webhookUrl` to paste
 * into the provider (the Supabase hook URL, the Clerk endpoint URL),
 * `status` (`pending_verification` until the first signed delivery) and
 * `authEmails`: one row per auth key, `ok: true` or `ok: false` with its
 * `error`. A failed key does not throw; connecting again finishes it.
 *
 * Re-runs are safe: the `connectionId` and `webhookUrl` never change for a
 * brand and provider, a new secret replaces the old one, and an app email
 * edited in Brew is kept. A PUT carries no `Idempotency-Key`; a retried
 * attempt converges on the same connection. A secret in the wrong format,
 * a provider the API does not connect, or a `projectUrl` that is not https
 * is `400 INVALID_REQUEST`.
 *
 * The SDK sends `signingSecret` in the request body only: it is never
 * logged, never put in a URL or header, and never part of an error it
 * throws. Long-running: the SDK applies a 5-minute default timeout
 * (`CONNECT_INTEGRATION_DEFAULT_TIMEOUT_MS`). An empty provider, `.` or
 * `..` throws a `TypeError` before any request.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ConnectIntegrationResponse>` instead of the unwrapped
 * body.
 */
export function createConnectIntegration(client: HttpClient) {
  function connect(
    input: ConnectIntegrationInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ConnectIntegrationResponse>>
  function connect(
    input: ConnectIntegrationInput,
    options?: RequestOptions
  ): Promise<ConnectIntegrationResponse>
  async function connect(
    input: ConnectIntegrationInput,
    options?: RequestOptions
  ): Promise<
    ConnectIntegrationResponse | BrewRawResponse<ConnectIntegrationResponse>
  > {
    const { provider, ...body } = input
    assertConnectionProvider(provider, 'integrations.connect')
    const response = await client.request<ConnectIntegrationResponse>({
      method: 'PUT',
      path: `/v1/integrations/${encodeURIComponent(provider)}/connection`,
      body,
      defaultTimeoutMs: CONNECT_INTEGRATION_DEFAULT_TIMEOUT_MS,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return connect
}
