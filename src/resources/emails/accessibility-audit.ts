import type { components } from '../../generated/openapi-types'
import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

export type AuditAccessibilityInput = {
  /**
   * The id of the saved email to audit. The email must belong to the
   * brand the API key is scoped to. Cross-brand or unknown ids surface
   * as `404 EMAIL_NOT_FOUND` from the server.
   */
  readonly emailId: string
}

/** Audit result returned by `POST /v1/emails/{emailId}/accessibility-audit`. */
export type EmailAccessibilityAuditResponse =
  components['schemas']['EmailAccessibilityAuditResponse']

/**
 * `POST /v1/emails/{emailId}/accessibility-audit` — a WCAG 2.1
 * accessibility audit of the email's rendered HTML (missing alt text,
 * non-descriptive links, low text contrast, tiny fonts, missing `lang`,
 * empty headings). Requires the `emails` scope.
 *
 * Returns a `score` (0–100), a `summary` (`{ errors, warnings }`), and a
 * list of `issues`, each with its `rule`, `severity`, `message`, and the
 * WCAG criterion. Fixed credit cost, charged only on success (see the
 * `X-Credit-Cost` header); if the audit can't complete it returns a
 * retryable `503` and is not billed.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<EmailAccessibilityAuditResponse>` instead of the
 * unwrapped payload.
 */
export function createAuditEmailAccessibility(client: HttpClient) {
  function auditAccessibility(
    input: AuditAccessibilityInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<EmailAccessibilityAuditResponse>>
  function auditAccessibility(
    input: AuditAccessibilityInput,
    options?: RequestOptions
  ): Promise<EmailAccessibilityAuditResponse>
  async function auditAccessibility(
    input: AuditAccessibilityInput,
    options?: RequestOptions
  ): Promise<
    | EmailAccessibilityAuditResponse
    | BrewRawResponse<EmailAccessibilityAuditResponse>
  > {
    const response = await client.request<EmailAccessibilityAuditResponse>({
      method: 'POST',
      path: `/v1/emails/${encodeURIComponent(input.emailId)}/accessibility-audit`,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return auditAccessibility
}
