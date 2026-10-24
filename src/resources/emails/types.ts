import type { components, operations } from '../../generated/openapi-types'

/**
 * One email design row. Lean from `brew.emails.list(...)` (identity +
 * render `status` + `previewImage`); the detail read
 * `brew.emails.get(emailId, { include })` can also carry the rendered
 * `html` and the inline `versions[]`.
 */
export type EmailSummary = components['schemas']['EmailSummary']

/**
 * The detail row with its rendered HTML — the shape of
 * `brew.emails.get(emailId, { include: 'html' })` once the design is `ready`.
 */
export type EmailDetail = components['schemas']['EmailDetail'] & {
  readonly html: string
}

/**
 * Render status of a design, from the one v1 vocabulary:
 * `generating | ready | failed`.
 */
export type EmailStatus = EmailSummary['status']

/**
 * The language of a design's copy: an ISO 639-1 code, or `zh-Hans` /
 * `zh-Hant`. Read on the detail row (`brew.emails.get`) once Brew has filed
 * it; accepted by `generate` and `edit`. Derived from the API enum, so a
 * language the API adds arrives with the next type sync.
 */
export type EmailLanguage = NonNullable<
  components['schemas']['EmailDetail']['lang']
>

/** The `sortBy` keys `GET /v1/emails` orders on. */
export type EmailsSortBy = NonNullable<
  NonNullable<operations['listEmails']['parameters']['query']>['sortBy']
>

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
 * carried by `brew.emails.get(emailId, { include: 'versions' })`.
 * `version: 'latest'` is the current head; numeric versions are
 * historical snapshots. Restore one by its `emailVersionId`.
 */
export type EmailVersion = NonNullable<EmailSummary['versions']>[number]
