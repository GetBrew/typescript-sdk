import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  BrewErrorCode,
  EmailCommentMessage,
  EmailCommentThread,
  ListEmailCommentsInput,
} from '../../../../src/index'
import { createEmailCommentsResource } from '../../../../src/resources/emails/comments/resource'
import { makeTestHttpClient } from '../../../helpers/http-client'
import { server } from '../../../msw/server'

const COMMENTS_URL = 'https://brew.new/api/v1/emails/:emailId/comments'
const EMAIL_ID = '2SmZOWV3ZQ7W5x6g3m4pA'
const COMMENT_ID = 'cmt_V1StGXR8_Z5jdHi6B-myT'

const GRACE = { userId: 'user_2xK9mPq4Rt7Vw1Yb', name: 'Grace Hopper' }
const ADA = { userId: 'user_2abcQ8sLm3Nd5Tz', name: 'Ada Lovelace' }

function message(messageId: string, minute: number) {
  const at = `2026-10-01T12:${String(minute).padStart(2, '0')}:00.000Z`
  return {
    messageId,
    author: minute % 2 === 0 ? GRACE : ADA,
    body: `message ${messageId}`,
    mentions: [],
    createdAt: at,
    updatedAt: at,
  }
}

function thread(overrides: Record<string, unknown> = {}) {
  return {
    commentId: COMMENT_ID,
    emailId: EMAIL_ID,
    status: 'open',
    target: { kind: 'element', elementId: 'elm_4f9Kq', nodeType: 'button' },
    participants: [GRACE, ADA],
    participantCount: 2,
    messageCount: 2,
    lastMessageAt: '2026-10-01T12:05:00.000Z',
    lastMessagePreview: 'Bolder works. Shipping it.',
    url: `https://brew.new/emails/ungrouped?emailIds=${EMAIL_ID}&commentId=${COMMENT_ID}`,
    ...overrides,
  }
}

function notFound(code: string, param: string) {
  return HttpResponse.json(
    {
      error: {
        code,
        type: 'not_found',
        message: `${param} was not found.`,
        param,
        suggestion:
          'List the design comments with GET /v1/emails/{emailId}/comments.',
        docs: 'https://docs.brew.new/api-reference/api/errors',
      },
    },
    { status: 404 }
  )
}

function page(data: Array<unknown>, cursor: string | null = null) {
  return {
    data,
    pagination: { limit: 100, cursor, hasMore: cursor !== null },
  }
}

describe('emails.comments.list', () => {
  it("GETs /v1/emails/{emailId}/comments and returns the design's open threads", async () => {
    let url: URL | undefined
    server.use(
      http.get(COMMENTS_URL, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(page([thread()]))
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createEmailCommentsResource(client).list({
      emailId: EMAIL_ID,
    })

    expect(url?.pathname).toBe(`/api/v1/emails/${EMAIL_ID}/comments`)
    expect(url?.search).toBe('')
    const row = result.data[0]
    expect(row?.commentId).toBe(COMMENT_ID)
    expect(row?.target).toEqual({
      kind: 'element',
      elementId: 'elm_4f9Kq',
      nodeType: 'button',
    })
    expect(row?.participants.map((person) => person.name)).toEqual([
      'Grace Hopper',
      'Ada Lovelace',
    ])
    // Without include=messages a row carries no messages.
    expect(row?.messages).toBeUndefined()
  })

  it('URL-encodes the emailId and forwards include, limit and cursor', async () => {
    let url: URL | undefined
    server.use(
      http.get(COMMENTS_URL, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(
          page([
            thread({
              messages: [message('cmm_1', 0), message('cmm_2', 5)],
              messagesCursor: null,
            }),
          ])
        )
      })
    )

    const { client } = makeTestHttpClient()
    const result = await createEmailCommentsResource(client).list({
      emailId: 'a/b c',
      include: ['messages'],
      limit: 3,
      cursor: 'keyset_2',
    })

    expect(url?.pathname).toBe('/api/v1/emails/a%2Fb%20c/comments')
    expect(url?.searchParams.get('include')).toBe('messages')
    expect(url?.searchParams.get('limit')).toBe('3')
    expect(url?.searchParams.get('cursor')).toBe('keyset_2')
    expect(result.data[0]?.messages?.map((m) => m.messageId)).toEqual([
      'cmm_1',
      'cmm_2',
    ])
    expect(result.data[0]?.messagesCursor).toBeNull()
  })

  it('reads one thread by commentId, with its messagesCursor', async () => {
    let params: URLSearchParams | undefined
    server.use(
      http.get(COMMENTS_URL, ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json(
          page([
            thread({ messages: [message('cmm_0', 1)], messagesCursor: null }),
          ])
        )
      })
    )

    const { client } = makeTestHttpClient()
    await createEmailCommentsResource(client).list({
      emailId: EMAIL_ID,
      commentId: COMMENT_ID,
      messagesCursor: 'eyJiZWZvcmUiOjF9',
      include: 'messages',
    })

    expect(params?.get('commentId')).toBe(COMMENT_ID)
    expect(params?.get('messagesCursor')).toBe('eyJiZWZvcmUiOjF9')
    expect(params?.get('include')).toBe('messages')
    expect(params?.has('cursor')).toBe(false)
  })

  it('returns an empty page for a design with no open threads', async () => {
    server.use(http.get(COMMENTS_URL, () => HttpResponse.json(page([]))))

    const { client } = makeTestHttpClient()
    const result = await createEmailCommentsResource(client).list({
      emailId: EMAIL_ID,
    })

    expect(result.data).toEqual([])
  })

  it('surfaces an unknown or other-brand design as 404 EMAIL_NOT_FOUND', async () => {
    server.use(
      http.get(COMMENTS_URL, () => notFound('EMAIL_NOT_FOUND', 'emailId'))
    )

    const { client } = makeTestHttpClient()

    await expect(
      createEmailCommentsResource(client).list({ emailId: 'unknown' })
    ).rejects.toMatchObject({
      status: 404,
      code: 'EMAIL_NOT_FOUND',
      type: 'not_found',
    })
  })

  it('surfaces a commentId that is not an open thread as 404 COMMENT_NOT_FOUND', async () => {
    server.use(
      http.get(COMMENTS_URL, () => notFound('COMMENT_NOT_FOUND', 'commentId'))
    )

    const { client } = makeTestHttpClient()

    await expect(
      createEmailCommentsResource(client).list({
        emailId: EMAIL_ID,
        commentId: 'cmt_resolved',
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'COMMENT_NOT_FOUND',
      param: 'commentId',
    })
  })

  it('returns the full BrewRawResponse with { raw: true }', async () => {
    server.use(
      http.get(COMMENTS_URL, () =>
        HttpResponse.json(page([thread()]), {
          headers: { 'x-request-id': 'req_comments' },
        })
      )
    )

    const { client } = makeTestHttpClient()
    const raw = await createEmailCommentsResource(client).list(
      { emailId: EMAIL_ID },
      { raw: true }
    )

    expect(raw.requestId).toBe('req_comments')
    expect(raw.data.data[0]?.commentId).toBe(COMMENT_ID)
  })

  it('surfaces a messagesCursor from another thread as 400 INVALID_REQUEST', async () => {
    server.use(
      http.get(COMMENTS_URL, () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              type: 'invalid_request',
              message: 'messagesCursor belongs to another thread.',
              param: 'messagesCursor',
              suggestion: "Send a thread's messagesCursor with its commentId.",
              docs: 'https://docs.brew.new/api-reference/api/errors',
            },
          },
          { status: 400 }
        )
      )
    )

    const { client } = makeTestHttpClient()

    await expect(
      createEmailCommentsResource(client).list({
        emailId: EMAIL_ID,
        commentId: 'cmt_other',
        messagesCursor: 'eyJiZWZvcmUiOjF9',
      })
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_REQUEST',
      param: 'messagesCursor',
    })
  })

  it('refuses at compile time the combinations the API answers 400', () => {
    expectTypeOf<{ emailId: string }>().toExtend<ListEmailCommentsInput>()
    expectTypeOf<{
      emailId: string
      include: ['messages']
      cursor: string
    }>().toExtend<ListEmailCommentsInput>()
    expectTypeOf<{
      emailId: string
      commentId: string
      messagesCursor: string
    }>().toExtend<ListEmailCommentsInput>()
    // `cursor` with `commentId`.
    expectTypeOf<{
      emailId: string
      commentId: string
      cursor: string
    }>().not.toExtend<ListEmailCommentsInput>()
    // `messagesCursor` without its `commentId`.
    expectTypeOf<{
      emailId: string
      messagesCursor: string
    }>().not.toExtend<ListEmailCommentsInput>()
    expectTypeOf<{
      emailId: string
      include: ['graph']
    }>().not.toExtend<ListEmailCommentsInput>()
    expectTypeOf<EmailCommentThread['status']>().toEqualTypeOf<'open'>()
    expectTypeOf<'COMMENT_NOT_FOUND'>().toExtend<BrewErrorCode>()
    expectTypeOf<'EMAIL_NOT_FOUND'>().toExtend<BrewErrorCode>()
    expectTypeOf<EmailCommentMessage['author']>().toEqualTypeOf<{
      userId: string
      name: string
    }>()
  })
})

describe('emails.comments.listAllMessages', () => {
  it("walks one thread's messagesCursor and yields its messages newest first", async () => {
    const seen: Array<Record<string, string>> = []
    server.use(
      http.get(COMMENTS_URL, ({ request }) => {
        const params = new URL(request.url).searchParams
        seen.push(Object.fromEntries(params))
        if (!params.has('messagesCursor')) {
          // The newest slice, oldest first.
          return HttpResponse.json(
            page([
              thread({
                messageCount: 5,
                messages: [message('cmm_4', 4), message('cmm_5', 5)],
                messagesCursor: 'older_1',
              }),
            ])
          )
        }
        if (params.get('messagesCursor') === 'older_1') {
          return HttpResponse.json(
            page([
              thread({
                messageCount: 5,
                messages: [message('cmm_2', 2), message('cmm_3', 3)],
                messagesCursor: 'older_2',
              }),
            ])
          )
        }
        return HttpResponse.json(
          page([
            thread({
              messageCount: 5,
              messages: [message('cmm_1', 1)],
              messagesCursor: null,
            }),
          ])
        )
      })
    )

    const { client } = makeTestHttpClient()
    const ids: Array<string> = []
    for await (const entry of createEmailCommentsResource(
      client
    ).listAllMessages({ emailId: EMAIL_ID, commentId: COMMENT_ID })) {
      ids.push(entry.messageId)
    }

    expect(ids).toEqual(['cmm_5', 'cmm_4', 'cmm_3', 'cmm_2', 'cmm_1'])
    expect(seen).toEqual([
      { commentId: COMMENT_ID, include: 'messages' },
      {
        commentId: COMMENT_ID,
        include: 'messages',
        messagesCursor: 'older_1',
      },
      {
        commentId: COMMENT_ID,
        include: 'messages',
        messagesCursor: 'older_2',
      },
    ])
  })

  it('throws 404 COMMENT_NOT_FOUND for a thread that is not open', async () => {
    server.use(
      http.get(COMMENTS_URL, () => notFound('COMMENT_NOT_FOUND', 'commentId'))
    )

    const { client } = makeTestHttpClient()
    const walk = async () => {
      for await (const entry of createEmailCommentsResource(
        client
      ).listAllMessages({ emailId: EMAIL_ID, commentId: 'cmt_resolved' })) {
        expect.unreachable(`yielded ${entry.messageId}`)
      }
    }

    await expect(walk()).rejects.toMatchObject({
      status: 404,
      code: 'COMMENT_NOT_FOUND',
    })
  })

  it('throws when the thread is resolved partway through, after yielding what it read', async () => {
    server.use(
      http.get(COMMENTS_URL, ({ request }) => {
        if (new URL(request.url).searchParams.has('messagesCursor')) {
          return notFound('COMMENT_NOT_FOUND', 'commentId')
        }
        return HttpResponse.json(
          page([
            thread({
              messages: [message('cmm_9', 9)],
              messagesCursor: 'older_1',
            }),
          ])
        )
      })
    )

    const { client } = makeTestHttpClient()
    const ids: Array<string> = []
    const walk = async () => {
      for await (const entry of createEmailCommentsResource(
        client
      ).listAllMessages({ emailId: EMAIL_ID, commentId: COMMENT_ID })) {
        ids.push(entry.messageId)
      }
    }

    await expect(walk()).rejects.toMatchObject({ code: 'COMMENT_NOT_FOUND' })
    expect(ids).toEqual(['cmm_9'])
  })

  it('ends quietly if the API answers an empty page instead of a 404', async () => {
    let calls = 0
    server.use(
      http.get(COMMENTS_URL, () => {
        calls += 1
        return HttpResponse.json(page([]))
      })
    )

    const { client } = makeTestHttpClient()
    const ids: Array<string> = []
    for await (const entry of createEmailCommentsResource(
      client
    ).listAllMessages({ emailId: EMAIL_ID, commentId: COMMENT_ID })) {
      ids.push(entry.messageId)
    }

    expect(ids).toEqual([])
    expect(calls).toBe(1)
  })

  it('stops fetching older slices once the caller aborts', async () => {
    let calls = 0
    server.use(
      http.get(COMMENTS_URL, () => {
        calls += 1
        return HttpResponse.json(
          page([
            thread({
              messages: [message(`cmm_${String(calls)}`, calls)],
              messagesCursor: `older_${String(calls)}`,
            }),
          ])
        )
      })
    )

    const controller = new AbortController()
    const { client } = makeTestHttpClient()
    const ids: Array<string> = []
    for await (const entry of createEmailCommentsResource(
      client
    ).listAllMessages(
      { emailId: EMAIL_ID, commentId: COMMENT_ID },
      { signal: controller.signal }
    )) {
      ids.push(entry.messageId)
      controller.abort()
    }

    expect(ids).toEqual(['cmm_1'])
    expect(calls).toBe(1)
  })
})
