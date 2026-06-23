import type { components, operations } from '../../generated/openapi-types'

/**
 * One row of the `data[]` array returned by `brew.emails.list(...)`
 * (`GET /v1/emails`). The list is intentionally lean — just enough to
 * identify and link to a design; fetch `brew.emails.get({ emailId })`
 * for the rendered `html` + `status`.
 */
export type EmailSummary =
  components['schemas']['EmailsListResponse']['data'][number]

/**
 * The full design row returned by `brew.emails.get({ emailId })`
 * (`GET /v1/emails/{emailId}`): identity + render `status`, the
 * rendered `html` of the current latest version, and `previewImage`
 * when one has been captured.
 */
export type EmailDetail = components['schemas']['EmailDetail']

export type EmailStatus =
  operations['listEmails']['parameters']['query'] extends infer Query
    ? Query extends { status?: infer Status }
      ? Status
      : never
    : never
export type GeneratedEmailArtifact = Extract<
  components['schemas']['EmailGenerateResponse'],
  { emailId: string }
>
export type GeneratedEmailTextResponse = Extract<
  components['schemas']['EmailGenerateResponse'],
  { response: string }
>

/**
 * One persisted version of an email — returned in the `data[]` array
 * of `brew.emails.versions({ emailId })`
 * (`GET /v1/emails/{emailId}/versions`). `version: 'latest'` is the
 * current head; numeric versions are historical snapshots.
 */
export type EmailVersion =
  components['schemas']['EmailVersionsResponse']['data'][number]
