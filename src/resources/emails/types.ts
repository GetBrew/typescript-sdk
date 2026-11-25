import type { components, operations } from '../../generated/openapi-types'

export type EmailSummary = components['schemas']['EmailSummary']

export type EmailDetail = components['schemas']['EmailDetail'] & {
  readonly html: string
}

export type EmailStatus = EmailSummary['status']

export type EmailLanguage = NonNullable<
  components['schemas']['EmailDetail']['lang']
>

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

export type EmailVersion = NonNullable<EmailSummary['versions']>[number]
