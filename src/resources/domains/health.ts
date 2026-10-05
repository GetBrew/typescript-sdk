import { unwrapResponse, type HttpClient } from '../../core/http'
import { serializeInclude } from '../../core/url'
import type { operations } from '../../generated/openapi-types'
import type { BrewRawResponse, RequestOptions } from '../../types'

/** The expansions `GET /v1/domains/{domainId}/health` accepts. */
export const DOMAIN_HEALTH_INCLUDE_TOKENS = [
  'scoreHistory',
  'scoreRuns',
] as const
export type DomainHealthIncludeToken =
  (typeof DOMAIN_HEALTH_INCLUDE_TOKENS)[number]

export type GetDomainHealthInput = {
  readonly domainId: string
  /**
   * `'scoreHistory'` attaches `scoreHistory`: up to 50 saved score
   * snapshots, newest first. `'scoreRuns'` attaches `scoreRuns`: the last
   * 5 automated domain score runs. Accepts an array of tokens or a comma
   * string.
   */
  readonly include?: ReadonlyArray<DomainHealthIncludeToken> | string
}

/**
 * The aggregate health report. `scoreHistory` / `scoreRuns` are present
 * only when `include` asks for them. Derived from the generated
 * `getDomainHealth` operation, so it follows the response schema the route
 * actually declares.
 */
export type GetDomainHealthResponse =
  operations['getDomainHealth']['responses'][200]['content']['application/json']

/**
 * One saved score snapshot (`include: 'scoreHistory'`): `score`, `grade`,
 * `confidence`, the event that saved it (`trigger`), `computedAt`, and each
 * pillar's score and weight (`components`).
 */
export type DomainScoreSnapshot = NonNullable<
  GetDomainHealthResponse['scoreHistory']
>[number]

/**
 * One automated domain score run (`include: 'scoreRuns'`) — the 5-variant
 * seed check: its `status` in the shared run vocabulary, the score it
 * ended on (`scoreAfter`), the credits it cost and every variant's
 * placement test.
 */
export type DomainScoreRun = NonNullable<
  GetDomainHealthResponse['scoreRuns']
>[number]

/**
 * `GET /v1/domains/{domainId}/health` (scope: `domains`) — the domain's
 * deliverability health in one FREE read: a `verdict` (`healthy` /
 * `at_risk` / `critical`) with actionable `signals`, DNS/auth state incl.
 * DMARC, active percentage-based gradual sends, general bounce/complaint
 * reporting, workspace reputation, and inbox-placement history.
 *
 * `domainActivity` samples up to 25 sends on this domain from the brand's
 * newest 100 campaign and 100 automation sends, excluding placement seeds.
 * Event automation rows can cover one recipient; audience-run automation
 * and campaign rows can cover many. This is a sample, not a time-window total.
 *
 * `include: 'scoreHistory'` adds `scoreHistory`: up to 50 saved score
 * snapshots, newest first (only snapshots saved under this brand count,
 * searched among the domain's newest 500, so a domain that moved between
 * brands can show fewer). `include: 'scoreRuns'` adds `scoreRuns`: the
 * last 5 automated domain score runs, each with its status, the score it
 * ended on, the credits it cost and every variant's placement test.
 *
 * `404 DOMAIN_NOT_FOUND` for an unknown domain; `400 INVALID_REQUEST` for
 * an unknown `include` token.
 */
export function createGetDomainHealth(client: HttpClient) {
  function getDomainHealth(
    input: GetDomainHealthInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<GetDomainHealthResponse>>
  function getDomainHealth(
    input: GetDomainHealthInput,
    options?: RequestOptions
  ): Promise<GetDomainHealthResponse>
  async function getDomainHealth(
    input: GetDomainHealthInput,
    options?: RequestOptions
  ): Promise<
    GetDomainHealthResponse | BrewRawResponse<GetDomainHealthResponse>
  > {
    const response = await client.request<GetDomainHealthResponse>({
      method: 'GET',
      path: `/v1/domains/${encodeURIComponent(input.domainId)}/health`,
      query: { include: serializeInclude({ include: input.include }) },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return getDomainHealth
}
