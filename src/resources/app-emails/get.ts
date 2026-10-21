import { unwrapResponse, type HttpClient } from '../../core/http'
import { assertTriggerKey } from '../../core/trigger-key'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { AppEmail } from './types'

export type GetAppEmailResponse = AppEmail

/**
 * `GET /v1/app-emails/{triggerKey}` (scope: `automations`) — one app email
 * by its trigger key, as the list row. A key with no app email set up in
 * the brand is `404 TRIGGER_KEY_NOT_FOUND`. The key is percent-encoded
 * into the path; an empty key, `.` or `..` throws a `TypeError` before
 * any request.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetAppEmailResponse>` instead of the unwrapped row.
 */
export function createGetAppEmail(client: HttpClient) {
  function getAppEmail(
    triggerKey: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAppEmailResponse>>
  function getAppEmail(
    triggerKey: string,
    options?: RequestOptions
  ): Promise<GetAppEmailResponse>
  async function getAppEmail(
    triggerKey: string,
    options?: RequestOptions
  ): Promise<GetAppEmailResponse | BrewRawResponse<GetAppEmailResponse>> {
    assertTriggerKey(triggerKey, 'appEmails.get')
    const response = await client.request<GetAppEmailResponse>({
      method: 'GET',
      path: `/v1/app-emails/${encodeURIComponent(triggerKey)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAppEmail
}
