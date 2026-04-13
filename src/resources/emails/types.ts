import type { components, operations } from '../../generated/openapi-types'

export type EmailSummary =
  components['schemas']['EmailsListResponse']['emails'][number]
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
