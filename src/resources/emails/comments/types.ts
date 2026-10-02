import type { operations } from '../../../generated/openapi-types'

/**
 * The page `GET /v1/emails/{emailId}/comments` returns: the design's open
 * comment threads, newest activity first, under `{ data, pagination }`.
 * Derived from the generated `listEmailComments` operation so a rename of
 * the response component cannot break it.
 */
export type EmailCommentsListResponse =
  operations['listEmailComments']['responses'][200]['content']['application/json']

/**
 * One open comment thread on a design, as the canvas pin shows it:
 * `commentId` (`cmt_…`), `target` (the whole email or one element), the 12
 * most recent `participants` with `participantCount`, `messageCount`,
 * `lastMessageAt`, `lastMessagePreview` and a `url` to the thread. With
 * `include: 'messages'` it also carries `messages` and `messagesCursor`.
 * Resolving a thread deletes it, so every row is `status: 'open'`.
 */
export type EmailCommentThread = EmailCommentsListResponse['data'][number]

/**
 * What a thread is pinned to: the whole design (`kind: 'email'`) or one
 * element of it (`kind: 'element'`, with `elementId` and `nodeType`).
 */
export type EmailCommentTarget = EmailCommentThread['target']

/**
 * One message of a thread (`include: 'messages'`): `messageId` (`cmm_…`),
 * `author`, `body` (a mention reads `@Name-abcd` in it), `mentions`,
 * `createdAt` and `updatedAt`.
 */
export type EmailCommentMessage = NonNullable<
  EmailCommentThread['messages']
>[number]

/** A person on a thread: `{ userId, name }`. */
export type EmailCommentPerson = EmailCommentThread['participants'][number]

/** The generated query `GET /v1/emails/{emailId}/comments` takes. */
export type ListEmailCommentsQuery = NonNullable<
  operations['listEmailComments']['parameters']['query']
>
