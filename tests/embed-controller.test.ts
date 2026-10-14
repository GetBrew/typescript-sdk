// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmailCanvas } from '../src/embed/controller'
import { CANVAS_PROTOCOL } from '../src/embed/contracts'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})
const session = {
  sessionId: 'session_a',
  target: { type: 'group' as const, groupId: 'grp_a' },
  embedUrl: 'https://brew.new/embed/canvas/session_a',
  bootstrapToken: 'secret',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
}
describe('iframe controller', () => {
  it('keeps commands available after nonfatal editing errors', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const onError = vi.fn()
    const controller = createEmailCanvas(container, {
      groupId: 'grp_a',
      getSession: () => Promise.resolve(session),
      onError,
    })
    await vi.waitFor(() =>
      expect(container.querySelector('iframe')).not.toBeNull()
    )
    const iframe = container.querySelector('iframe')!
    const send = vi.spyOn(iframe.contentWindow!, 'postMessage')
    const instanceId = new URL(iframe.src).searchParams.get('instanceId')!
    const message = (type: string, fields = {}) =>
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://brew.new',
          source: iframe.contentWindow,
          data: { protocol: CANVAS_PROTOCOL, instanceId, type, ...fields },
        })
      )
    try {
      message('ready')
      message('error', {
        code: 'COMMAND_FAILED',
        message: 'A removed draft was retained.',
      })
      const flush = controller.flush()
      const request = send.mock.calls.at(-1)?.[0] as
        | { requestId: string }
        | undefined
      expect(request).toBeDefined()
      message('result', { requestId: request?.requestId })
      await expect(flush).resolves.toBeUndefined()
      expect(onError).toHaveBeenCalledOnce()
      message('error', { code: 'SESSION_EXPIRED', message: 'Access ended.' })
      await expect(controller.flush()).rejects.toMatchObject({
        code: 'CONNECTION_FAILED',
      })
    } finally {
      controller.destroy()
    }
  })
  it('bounds stalled renewals even when the provider ignores abort, then permits retry', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    let renewalSignal: AbortSignal | undefined
    const provider = vi
      .fn()
      .mockResolvedValueOnce(session)
      .mockImplementationOnce((request: { signal: AbortSignal }) => {
        renewalSignal = request.signal
        return new Promise(() => {})
      })
      .mockImplementationOnce(() =>
        Promise.resolve({
          ...session,
          bootstrapToken: 'renewed',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        })
      )
    const container = document.createElement('div')
    document.body.append(container)
    const canvas = createEmailCanvas(container, {
      groupId: 'grp_a',
      getSession: provider,
      onError,
    })
    try {
      await vi.advanceTimersByTimeAsync(0)
      const iframe = container.querySelector('iframe')!
      const instanceId = new URL(iframe.src).searchParams.get('instanceId')!
      const message = (type: string) =>
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'https://brew.new',
            source: iframe.contentWindow,
            data: { protocol: CANVAS_PROTOCOL, instanceId, type },
          })
        )
      message('ready')
      message('renew')
      await vi.advanceTimersByTimeAsync(30_000)
      expect(renewalSignal?.aborted).toBe(true)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CONNECTION_FAILED' })
      )
      message('renew')
      await vi.advanceTimersByTimeAsync(0)
      expect(provider).toHaveBeenCalledTimes(3)
      expect(container.querySelector('iframe')).toBe(iframe)
    } finally {
      canvas.destroy()
      vi.useRealTimers()
    }
  })
  it('reports a stalled initial connection and aborts its session request', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    let signal: AbortSignal | undefined
    const controller = createEmailCanvas(document.createElement('div'), {
      groupId: 'grp_a',
      getSession: (request) => {
        signal = request.signal
        return new Promise((_resolve, reject) =>
          request.signal.addEventListener(
            'abort',
            () => reject(new Error('Aborted')),
            { once: true }
          )
        )
      },
      onError,
    })
    try {
      await vi.advanceTimersByTimeAsync(120_000)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CONNECTION_FAILED' })
      )
      expect(onError).toHaveBeenCalledOnce()
      expect(signal?.aborted).toBe(true)
    } finally {
      controller.destroy()
      vi.useRealTimers()
    }
  })
  it('rejects an invalid trusted origin with a typed error', () => {
    expect(() =>
      createEmailCanvas(document.createElement('div'), {
        groupId: 'grp_a',
        embedOrigin: 'invalid',
        getSession: () => Promise.resolve(session),
      })
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
  })
  it('renews a bootstrap credential after a slow iframe startup without remounting', async () => {
    const onError = vi.fn()
    const provider = vi.fn().mockResolvedValue(session)
    const container = document.createElement('div')
    document.body.append(container)
    const controller = createEmailCanvas(container, {
      groupId: 'grp_a',
      getSession: provider,
      onError,
    })
    await vi.waitFor(() =>
      expect(container.querySelector('iframe')).not.toBeNull()
    )
    const iframe = container.querySelector('iframe')!
    const send = vi.spyOn(iframe.contentWindow!, 'postMessage')
    const instanceId = new URL(iframe.src).searchParams.get('instanceId')!
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(session.expiresAt) - 1000)
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://brew.new',
        source: iframe.contentWindow,
        data: { protocol: CANVAS_PROTOCOL, instanceId, type: 'handshake' },
      })
    )
    await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(2))
    expect(provider).toHaveBeenLastCalledWith(
      expect.objectContaining({ sessionId: 'session_a' })
    )
    expect(container.querySelector('iframe')).toBe(iframe)
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce())
    expect(onError).not.toHaveBeenCalled()
    controller.destroy()
  })
  it('authenticates only its own iframe and resolves commands by request ID', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const controller = createEmailCanvas(container, {
      groupId: 'grp_a',
      getSession: () => Promise.resolve(session),
    })
    await vi.waitFor(() =>
      expect(container.querySelector('iframe')).not.toBeNull()
    )
    const iframe = container.querySelector('iframe')!
    const send = vi.spyOn(iframe.contentWindow!, 'postMessage')
    const instanceId = new URL(iframe.src).searchParams.get('instanceId')!
    const message = (
      type: string,
      fields = {},
      origin = 'https://brew.new',
      source = iframe.contentWindow
    ) => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin,
          source,
          data: { protocol: CANVAS_PROTOCOL, instanceId, type, ...fields },
        })
      )
    }
    message('handshake', {}, 'https://attacker.example')
    expect(send).not.toHaveBeenCalled()
    message('handshake')
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'authenticate',
        bootstrapToken: 'secret',
      }),
      'https://brew.new'
    )
    message('ready')
    const flush = controller.flush()
    const sent = send.mock.calls.at(-1)![0] as { requestId: string }
    message('result', { requestId: sent.requestId })
    await expect(flush).resolves.toBeUndefined()
    controller.destroy()
    expect(container.querySelector('iframe')).toBeNull()
    await expect(controller.flush()).rejects.toMatchObject({
      code: 'DESTROYED',
    })
  })
  it('rejects a mismatched grant before transferring credentials', async () => {
    const onError = vi.fn()
    const container = document.createElement('div')
    const controller = createEmailCanvas(container, {
      emailId: 'email_a',
      getSession: () => Promise.resolve(session),
      onError,
    })
    await vi.waitFor(() => expect(onError).toHaveBeenCalled())
    expect(container.querySelector('iframe')).toBeNull()
    controller.destroy()
  })
})
