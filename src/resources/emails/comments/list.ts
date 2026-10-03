import { autoPaginate, pageReadOptions } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import { serializeInclude } from '../../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  EmailCommentMessage,
  EmailCommentsListResponse,
  ListEmailCommentsQuery,
} from './types'

/** The one expansion `GET /v1/emails/{emailId}/comments` accepts. */
export const EMAIL_COMMENTS_INCLUDE_TOKENS = ['messages'] as const
export type EmailCommentsIncludeToken =
  (typeof EMAIL_COMMENTS_INCLUDE_TOKENS)[number]

type ListEmailCommentsBase = {
  /** The design whose comment threads you are reading. */
  readonly emailId: string
  /**
   * `'messages'` adds each thread's newest messages (author, body,
   * mentions), oldest first, with a `messagesCursor` for older ones, and
   * caps the page at 3 threads sharing a fixed size budget. Accepts a
   * token, an array of tokens, or a comma string.
   */
  readonly include?: ReadonlyArray<EmailCommentsIncludeToken> | string
  /** Page size (1–100, default 100; at most 3 with `include: 'messages'`). */
  readonly limit?: ListEmailCommentsQuery['limit']
}

/**
 * Input to `brew.emails.comments.list(...)`. Either a page of the design's
 * threads (`cursor` to page), or ONE thread by `commentId` — optionally
 * with that thread's `messagesCursor` to read its next older messages.
 * The API refuses `cursor` with `commentId`, and a `messagesCursor`
 * without its `commentId` (`400 INVALID_REQUEST`), so the type does too.
 */
export type ListEmailCommentsInput =
  | (ListEmailCommentsBase & {
      readonly cursor?: ListEmailCommentsQuery['cursor']
      readonly commentId?: never
      readonly messagesCursor?: never
    })
  | (ListEmailCommentsBase & {
      /** Read this one thread (`cmt_…`) instead of the page. */
      readonly commentId: NonNullable<ListEmailCommentsQuery['commentId']>
      /**
       * The thread's `messagesCursor` from a previous response: returns the
       * thread with its next older messages and the next `messagesCursor`.
       * Implies `include: 'messages'`.
       */
      readonly messagesCursor?: ListEmailCommentsQuery['messagesCursor']
      readonly cursor?: never
    })

export type ListEmailCommentsResponse = EmailCommentsListResponse

/**
 * `GET /v1/emails/{emailId}/comments` (scope: `emails`) — one design's
 * open comment threads, newest activity first, under
 * `{ data, pagination }`, as the canvas pins show them: `commentId`,
 * `target` (whole email or one element), the 12 most recent
 * `participants` with `participantCount`, `messageCount`, the latest
 * message preview and a link to the thread. People are `{ userId, name }`;
 * resolving deletes a thread. Free.
 *
 * Use it to read what teammates asked for on a design before editing it.
 * `include: 'messages'` adds each thread's newest messages, oldest first,
 * and caps the page at 3 threads. A thread with older messages returns
 * `messagesCursor`: send it back with that thread's `commentId` to read the
 * next older slice, until it comes back `null` —
 * `brew.emails.comments.listAllMessages` does that walk for you.
 * `commentId` alone reads one thread.
 *
 * An email with no open threads is an empty page. Errors:
 * `404 EMAIL_NOT_FOUND` for an unknown or other-brand design;
 * `404 COMMENT_NOT_FOUND` for a `commentId` that is not an open thread on
 * it (resolving a thread deletes it); `400 INVALID_REQUEST` for an unknown
 * `include` token, a malformed cursor, a `messagesCursor` without its
 * `commentId` or from another thread, or `cursor` with `commentId`.
 *
 * Pass `{ raw: true }` in `options` to receive the full
 * `BrewRawResponse<ListEmailCommentsResponse>` instead of the unwrapped
 * page.
 */
export function createListEmailComments(client: HttpClient) {
  function listEmailComments(
    input: ListEmailCommentsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ListEmailCommentsResponse>>
  function listEmailComments(
    input: ListEmailCommentsInput,
    options?: RequestOptions
  ): Promise<ListEmailCommentsResponse>
  async function listEmailComments(
    input: ListEmailCommentsInput,
    options?: RequestOptions
  ): Promise<
    ListEmailCommentsResponse | BrewRawResponse<ListEmailCommentsResponse>
  > {
    const response = await client.request<ListEmailCommentsResponse>({
      method: 'GET',
      path: `/v1/emails/${encodeURIComponent(input.emailId)}/comments`,
      query: {
        include: serializeInclude({ include: input.include }),
        commentId: input.commentId,
        messagesCursor: input.messagesCursor,
        limit: input.limit,
        cursor: input.cursor,
      },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return listEmailComments
}

/** Input to `brew.emails.comments.listAllMessages(...)`: the thread to walk. */
export type ListAllEmailCommentMessagesInput = {
  readonly emailId: string
  readonly commentId: NonNullable<ListEmailCommentsQuery['commentId']>
}

/**
 * Async iterator over ONE thread's messages, NEWEST FIRST, yielding one
 * `EmailCommentMessage` at a time. It reads the thread with
 * `include: 'messages'`, then follows its `messagesCursor` back through
 * older slices until it is `null`. Each slice arrives oldest first; the
 * iterator reverses it so the whole walk runs newest to oldest — stop the
 * loop after N for the N most recent. Honors `options.signal` between
 * slices.
 *
 * It throws what `list` throws: `404 EMAIL_NOT_FOUND` for an unknown
 * design, and `404 COMMENT_NOT_FOUND` for a thread that is not open —
 * including one resolved partway through the walk, after some messages
 * were already yielded.
 *
 * ```ts
 * for await (const message of brew.emails.comments.listAllMessages({
 *   emailId,
 *   commentId: 'cmt_V1StGXR8_Z5jdHi6B-myT',
 * })) {
 *   console.log(message.author.name, message.body)
 * }
 * ```
 */
export function createListAllEmailCommentMessages(client: HttpClient) {
  const list = createListEmailComments(client)

  return function listAllEmailCommentMessages(
    input: ListAllEmailCommentMessagesInput,
    options?: RequestOptions
  ): AsyncGenerator<EmailCommentMessage, void, void> {
    return autoPaginate<EmailCommentMessage>(
      async (messagesCursor) => {
        const response = await list(
          {
            emailId: input.emailId,
            commentId: input.commentId,
            include: 'messages',
            ...(messagesCursor !== null ? { messagesCursor } : {}),
          },
          pageReadOptions({ options })
        )
        const thread = response.data[0]
        const next = thread?.messagesCursor ?? null
        return {
          items: [...(thread?.messages ?? [])].reverse(),
          pagination: {
            limit: response.pagination.limit,
            cursor: next,
            hasMore: next !== null,
          },
        }
      },
      options?.signal ? { signal: options.signal } : undefined
    )
  }
}
