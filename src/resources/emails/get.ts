import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** Expansions `GET /v1/emails/{emailId}` accepts. */
export const EMAILS_INCLUDE_TOKENS = ['html', 'versions'] as const
export type EmailsIncludeToken = (typeof EMAILS_INCLUDE_TOKENS)[number]

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
  /**
   * Read this saved version instead of the current head (an
   * `emailVersionId` from `include: 'versions'`). Mutually exclusive with
   * `runId`.
   */
  readonly emailVersionId?: string
  /**
   * Read the version one generation run produced — the `runId` a
   * `generate` or `edit` returned while it was still `generating`. A run
   * that failed answers `status: 'failed'` with `errorMessage`. Mutually
   * exclusive with `emailVersionId`.
   */
  readonly runId?: string
}

/**
 * `GET /v1/emails/{emailId}` returns the BARE design row plus what the read
 * selected: `version`, `runId`, `previewStatus` (`available`, `unavailable`,
 * `not_ready`), and on a failed run `errorMessage` / `errorCause`.
 */
export type GetEmailResponse = components['schemas']['EmailDetail']

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
 * Pin a saved version with `emailVersionId`, or poll a generation with the
 * `runId` it returned (a run that failed reads `status: 'failed'`). An
 * unknown version or run is `404 EMAIL_VERSION_NOT_FOUND`.
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
    const query = {
      ...(include !== undefined ? { include } : {}),
      ...(options?.emailVersionId !== undefined
        ? { emailVersionId: options.emailVersionId }
        : {}),
      ...(options?.runId !== undefined ? { runId: options.runId } : {}),
    }
    const response = await client.request<GetEmailResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(emailId)}`,
      ...(Object.keys(query).length > 0 ? { query } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getEmail
}
