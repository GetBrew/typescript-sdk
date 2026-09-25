import type { operations } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** The rendering job: its status, per-client results, expiry and credits. */
export type GetEmailClientPreviewResponse =
  operations['getEmailRendering']['responses'][200]['content']['application/json']

/**
 * `GET /v1/emails/client-previews/{previewId}` (scope: `emails`) — read a
 * rendering job started by `brew.emails.previewClients(...)`. Poll the same
 * `previewId` after `nextPollAfterMs` while `status` is `queued` or
 * `running`; it then settles as `completed`, `partially_completed` or
 * `failed`. Each client carries its full-size `imageUrl`, or a `reason` and
 * whether it is `retryable`. Reading never resubmits the job or charges
 * again. An unknown id is `404 PREVIEW_NOT_FOUND`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetEmailClientPreviewResponse>` instead of the job.
 */
export function createGetEmailClientPreview(client: HttpClient) {
  function getClientPreview(
    previewId: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetEmailClientPreviewResponse>>
  function getClientPreview(
    previewId: string,
    options?: RequestOptions
  ): Promise<GetEmailClientPreviewResponse>
  async function getClientPreview(
    previewId: string,
    options?: RequestOptions
  ): Promise<
    | GetEmailClientPreviewResponse
    | BrewRawResponse<GetEmailClientPreviewResponse>
  > {
    const response = await client.request<GetEmailClientPreviewResponse>({
      method: 'GET',
      path: `/v1/emails/client-previews/${encodeURIComponent(previewId)}`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getClientPreview
}
