import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createGetChat } from '../../../src/resources/chats/get'
import { BrewApiError } from '../../../src/core/errors'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

describe('chats.get', () => {
  it('GETs /v1/chats/{chatId} and returns the typed digest', async () => {
    let capturedRequest: Request | undefined
    server.use(
      http.get('https://brew.new/api/v1/chats/:chatId', ({ request }) => {
        capturedRequest = request
        return HttpResponse.json({
          chatId: 'Hk2mZ8t9QbY3sW1vR0pLd',
          title: 'Spring launch campaign',
          modelId: 'claude-opus-4-1',
          updatedAt: '2026-06-30T12:34:56.789Z',
          messageCount: 18,
          artifacts: [
            {
              type: 'email',
              id: 'tCYL9yyvZZ5XmR6saDR-M',
              title: 'Spring Launch — Hero',
              imageUrl:
                'https://cdn.brew.new/email-preview-tCYL9yyvZZ5XmR6saDR-M.png',
            },
            { type: 'automation', id: 'au_7t2', title: 'Welcome series' },
          ],
          triggerEventIds: ['te_signup'],
          recentMessages: [
            { role: 'user', text: 'Make the hero bolder and add a CTA.' },
            {
              role: 'assistant',
              text: 'Updated the hero and added a "Shop now" button.',
            },
          ],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const get = createGetChat(client)

    const result = await get('Hk2mZ8t9QbY3sW1vR0pLd')

    expect(capturedRequest?.method).toBe('GET')
    expect(new URL(capturedRequest!.url).pathname).toBe(
      '/api/v1/chats/Hk2mZ8t9QbY3sW1vR0pLd'
    )
    expect(result.chatId).toBe('Hk2mZ8t9QbY3sW1vR0pLd')
    expect(result.title).toBe('Spring launch campaign')
    expect(result.modelId).toBe('claude-opus-4-1')
    expect(result.messageCount).toBe(18)
    expect(result.artifacts).toHaveLength(2)
    expect(result.artifacts[0]?.type).toBe('email')
    expect(result.artifacts[0]?.imageUrl).toBe(
      'https://cdn.brew.new/email-preview-tCYL9yyvZZ5XmR6saDR-M.png'
    )
    expect(result.artifacts[1]?.type).toBe('automation')
    expect(result.triggerEventIds).toEqual(['te_signup'])
    expect(result.recentMessages).toHaveLength(2)
    expect(result.recentMessages[0]?.role).toBe('user')
  })

  it('URL-encodes the chatId path segment', async () => {
    let capturedUrl: URL | undefined
    server.use(
      http.get('https://brew.new/api/v1/chats/:chatId', ({ request }) => {
        capturedUrl = new URL(request.url)
        return HttpResponse.json({
          chatId: 'a/b c',
          title: null,
          modelId: null,
          updatedAt: null,
          messageCount: 0,
          artifacts: [],
          triggerEventIds: [],
          recentMessages: [],
        })
      })
    )

    const { client } = makeTestHttpClient()
    const get = createGetChat(client)

    const result = await get('a/b c')

    expect(capturedUrl?.pathname).toBe('/api/v1/chats/a%2Fb%20c')
    // Nullable fields round-trip as null, not undefined.
    expect(result.title).toBeNull()
    expect(result.modelId).toBeNull()
    expect(result.updatedAt).toBeNull()
  })

  it('returns the full BrewRawResponse when called with { raw: true }', async () => {
    server.use(
      http.get('https://brew.new/api/v1/chats/:chatId', () =>
        HttpResponse.json(
          {
            chatId: 'chat_raw',
            title: 'Raw',
            modelId: null,
            updatedAt: null,
            messageCount: 1,
            artifacts: [],
            triggerEventIds: [],
            recentMessages: [{ role: 'system', text: 'hello' }],
          },
          { status: 200, headers: { 'x-request-id': 'req_chat' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const get = createGetChat(client)

    const raw = await get('chat_raw', { raw: true })

    expect(raw.status).toBe(200)
    expect(raw.requestId).toBe('req_chat')
    expect(raw.data.chatId).toBe('chat_raw')
    expect(raw.data.recentMessages[0]?.role).toBe('system')
  })

  it('surfaces a 404 CHAT_NOT_FOUND as a BrewApiError', async () => {
    server.use(
      http.get('https://brew.new/api/v1/chats/:chatId', () =>
        HttpResponse.json(
          {
            error: {
              code: 'CHAT_NOT_FOUND',
              type: 'not_found',
              message: "The requested chat 'chat_xxx' was not found.",
              suggestion:
                "Check the chatId, and that your key/connector is bound to that chat's brand.",
              docs: 'https://docs.brew.new/api-reference/api/errors',
              param: 'chatId',
            },
          },
          { status: 404, headers: { 'x-request-id': 'req_404' } }
        )
      )
    )

    const { client } = makeTestHttpClient()
    const get = createGetChat(client)

    await expect(get('chat_xxx')).rejects.toMatchObject({
      status: 404,
      code: 'CHAT_NOT_FOUND',
    })
    await expect(get('chat_xxx')).rejects.toBeInstanceOf(BrewApiError)
  })
})
