import type { operations } from '../../../generated/openapi-types'

export type EmailCommentsListResponse =
  operations['listEmailComments']['responses'][200]['content']['application/json']

export type EmailCommentThread = EmailCommentsListResponse['data'][number]

export type EmailCommentTarget = EmailCommentThread['target']

export type EmailCommentMessage = NonNullable<
  EmailCommentThread['messages']
>[number]

export type EmailCommentPerson = EmailCommentThread['participants'][number]

export type ListEmailCommentsQuery = NonNullable<
  operations['listEmailComments']['parameters']['query']
>
