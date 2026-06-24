import type { components, operations } from '../../generated/openapi-types'

/**
 * One row of the `data[]` array returned by `brew.emails.list(...)`
 * (`GET /v1/emails`). In list mode the row is lean (identity + render
 * `status` + `previewImage`); in detail mode (`?emailId=`) it can also
 * carry `html` (`?include=html`) and the inline `versions[]`
 * (`?include=versions`).
 */
export type EmailSummary =
  components['schemas']['EmailsListResponse']['data'][number]

/**
 * The full design row (identity + render `status`, the rendered `html`
 * of the current latest version, and `previewImage` when captured) —
 * the shape of a single detail-mode row from
 * `brew.emails.list({ emailId, include: 'html' })`.
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
 * One persisted version of an email — a row of the inline `versions[]`
 * carried on a detail-mode email row when
 * `brew.emails.list({ emailId, include: 'versions' })` is used.
 * `version: 'latest'` is the current head; numeric versions are
 * historical snapshots.
 */
export type EmailVersion = NonNullable<EmailSummary['versions']>[number]
