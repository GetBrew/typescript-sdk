import type { components, operations } from '../../generated/openapi-types'

export type EmailSummary =
  components['schemas']['EmailsListResponse']['emails'][number]
/**
 * Three-way classification surfaced on every email row + accepted as
 * a filter on `brew.emails.list({ emailType })`:
 *
 * - `campaign` — one-shot send to an audience / contact list
 *   (canvas-board default).
 * - `automation` — body referenced by `sendEmail` nodes inside an
 *   automation graph. NEVER shows on the /emails canvas.
 * - `transactional` — system-triggered (welcome / receipt / reset).
 */
export type EmailType = components['schemas']['EmailType']
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
 * One persisted version of an email — returned in the `versions[]`
 * sibling array of `brew.emails.versions({ emailId })`. `version:
 * 'latest'` is the current head; numeric versions are historical.
 */
export type EmailVersion = NonNullable<
  components['schemas']['EmailsListResponse']['versions']
>[number]
