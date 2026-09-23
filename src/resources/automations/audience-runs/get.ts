import { unwrapResponse, type HttpClient } from '../../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type { AudienceRun } from './types'

/** `GET /v1/automations/audience-runs/{audienceRunId}` returns the BARE row. */
export type GetAudienceRunResponse = AudienceRun

/**
 * `GET /v1/automations/audience-runs/{audienceRunId}` (scope:
 * `automations`) — one manual-audience run, returned as the BARE row:
 * lifecycle `status`, recipient totals, per-node `nodeStats`, and the
 * `gradualSend` ramp when the launch used one.
 *
 * An unknown or cross-brand id is `404 AUDIENCE_RUN_NOT_FOUND` — it is
 * no longer an empty page you have to test for.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetAudienceRunResponse>` instead of the unwrapped
 * row.
 */
export function createGetAudienceRun(client: HttpClient) {
  function getAudienceRun(
    audienceRunId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetAudienceRunResponse>>
  function getAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<GetAudienceRunResponse>
  async function getAudienceRun(
    audienceRunId: string,
    options?: RequestOptions
  ): Promise<GetAudienceRunResponse | BrewRawResponse<GetAudienceRunResponse>> {
    const response = await client.request<GetAudienceRunResponse>({
      method: 'GET',
      path: `/v1/automations/audience-runs/${encodeURIComponent(audienceRunId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getAudienceRun
}
