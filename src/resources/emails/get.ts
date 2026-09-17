import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type { EmailSummary } from './types'

/** Expansions `GET /v1/emails/{emailId}` accepts. */
export type EmailsIncludeToken = 'html' | 'versions'

/**
 * Per-request options for `brew.emails.get(...)` — the standard
 * `RequestOptions` plus the detail-only `include` expansions.
 */
export type GetEmailOptions = RequestOptions & {
  /**
   * `'html'` inlines the rendered HTML of the current version;
   * `'versions'` inlines the `{ version, emailVersionId }` history.
   * Accepts a token, an array of tokens, or a comma string.
   */
  readonly include?: ReadonlyArray<EmailsIncludeToken> | string
}

/** `GET /v1/emails/{emailId}` returns the BARE design row. */
export type GetEmailResponse = EmailSummary

/** Serialize the `include` option into the API's comma-separated form. */
function serializeInclude(
  include: GetEmailOptions['include']
): string | undefined {
  if (include === undefined) return undefined
  const joined = typeof include === 'string' ? include : include.join(',')
  return joined.length > 0 ? joined : undefined
}

/**
 * `GET /v1/emails/{emailId}` (scope: `emails`) — one email design,
 * returned as the BARE row. Pass `include: 'html'` for the rendered HTML
 * of the current version and/or `include: 'versions'` for the
 * `{ version, emailVersionId }` history — the ids
 * `brew.emails.restore(...)` takes.
 *
 * An unknown or cross-brand id is `404 EMAIL_NOT_FOUND` — it is no
 * longer an empty page you have to test for.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<GetEmailResponse>` instead of the unwrapped row.
 */
export function createGetEmail(client: HttpClient) {
  function getEmail(
    emailId: string,
    options: GetEmailOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetEmailResponse>>
  function getEmail(
    emailId: string,
    options?: GetEmailOptions
  ): Promise<GetEmailResponse>
  async function getEmail(
    emailId: string,
    options?: GetEmailOptions
  ): Promise<GetEmailResponse | BrewRawResponse<GetEmailResponse>> {
    const include = serializeInclude(options?.include)
    const response = await client.request<GetEmailResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(emailId)}`,
      ...(include !== undefined ? { query: { include } } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getEmail
}
