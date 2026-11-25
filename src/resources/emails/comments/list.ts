import { autoPaginate, pageReadOptions } from '../../../core/pagination'
import { unwrapResponse, type HttpClient } from '../../../core/http'
import { serializeInclude } from '../../../core/url'
import type { BrewRawResponse, RequestOptions } from '../../../types'

import type {
  EmailCommentMessage,
  EmailCommentsListResponse,
  ListEmailCommentsQuery,
} from './types'

export const EMAIL_COMMENTS_INCLUDE_TOKENS = ['messages'] as const
export type EmailCommentsIncludeToken =
  (typeof EMAIL_COMMENTS_INCLUDE_TOKENS)[number]

type ListEmailCommentsBase = {
  readonly emailId: string
  readonly include?: ReadonlyArray<EmailCommentsIncludeToken> | string
  readonly limit?: ListEmailCommentsQuery['limit']
}

export type ListEmailCommentsInput =
  | (ListEmailCommentsBase & {
      readonly cursor?: ListEmailCommentsQuery['cursor']
      readonly commentId?: never
      readonly messagesCursor?: never
    })
  | (ListEmailCommentsBase & {
      readonly commentId: NonNullable<ListEmailCommentsQuery['commentId']>
      readonly messagesCursor?: ListEmailCommentsQuery['messagesCursor']
      readonly cursor?: never
    })

export type ListEmailCommentsResponse = EmailCommentsListResponse

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

export type ListAllEmailCommentMessagesInput = {
  readonly emailId: string
  readonly commentId: NonNullable<ListEmailCommentsQuery['commentId']>
}

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
