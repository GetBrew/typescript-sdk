// @vitest-environment jsdom
import {
  StrictMode,
  Suspense,
  startTransition,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmailCanvas, type EmailCanvasHandle } from '../src/react'
afterEach(cleanup)
describe('React email canvas', () => {
  it('keeps committed callbacks while a concurrent render suspends', async () => {
    const committed = vi.fn()
    const pending = vi.fn()
    const getSession = () =>
      Promise.resolve({
        sessionId: 's',
        target: { type: 'email' as const, emailId: 'e' },
        embedUrl: 'https://brew.new/embed/canvas/s',
        bootstrapToken: 'test',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })
    const suspended = new Promise(() => {})
    let hasRenderedPending = false
    function Block({ isPending }: { isPending: boolean }) {
      if (isPending) hasRenderedPending = true
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Suspense requires throwing the pending promise.
      if (isPending) throw suspended
      return null
    }
    function Host() {
      const [isPending, setIsPending] = useState(false)
      return (
        <>
          <button onClick={() => startTransition(() => setIsPending(true))}>
            Change
          </button>
          <Suspense fallback={<p>Loading</p>}>
            <EmailCanvas
              emailId="e"
              getSession={getSession}
              onSaved={isPending ? pending : committed}
            />
            <Block isPending={isPending} />
          </Suspense>
        </>
      )
    }
    const view = render(<Host />)
    await vi.waitFor(() =>
      expect(view.container.querySelector('iframe')).not.toBeNull()
    )
    const iframe = view.container.querySelector('iframe')!
    act(() => {
      fireEvent.click(view.getByText('Change'))
    })
    await vi.waitFor(() => expect(hasRenderedPending).toBe(true))
    expect(view.container.querySelector('iframe')).toBe(iframe)
    await act(() =>
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://brew.new',
          source: iframe.contentWindow,
          data: {
            protocol: 'brew.canvas.v1',
            instanceId: new URL(iframe.src).searchParams.get('instanceId'),
            type: 'saved',
            saved: { emailId: 'e', emailVersionId: null, updatedAt: 'now' },
          },
        })
      )
    )
    expect(committed).toHaveBeenCalledOnce()
    expect(pending).not.toHaveBeenCalled()
  })
  it('rejects ambiguous targets supplied by JavaScript callers before requesting a session', () => {
    const getSession = vi.fn()
    expect(() =>
      render(
        // @ts-expect-error Deliberately exercise an invalid JavaScript consumer.
        <EmailCanvas groupId="g" emailId="e" getSession={getSession} />
      )
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
    expect(getSession).not.toHaveBeenCalled()
  })
  it('returns a rejected promise when the ref is called before its controller mounts', async () => {
    const failures: Array<unknown> = []
    function Host() {
      const ref = useRef<EmailCanvasHandle>(null)
      useLayoutEffect(() => {
        void ref.current
          ?.flush()
          .catch((error: unknown) => failures.push(error))
      }, [])
      return (
        <EmailCanvas
          ref={ref}
          emailId="e"
          getSession={() => new Promise(() => {})}
        />
      )
    }
    expect(() => render(<Host />)).not.toThrow()
    await vi.waitFor(() =>
      expect(failures).toEqual([
        expect.objectContaining({ code: 'CONNECTION_FAILED' }),
      ])
    )
  })
  it('survives Strict Mode and changing callback identities without remounting its iframe', async () => {
    const session = {
      sessionId: 's',
      target: { type: 'email' as const, emailId: 'e' },
      embedUrl: 'https://brew.new/embed/canvas/s',
      bootstrapToken: 'test',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }
    const getSession = vi.fn(() => Promise.resolve(session))
    const rendered = render(
      <StrictMode>
        <EmailCanvas emailId="e" getSession={getSession} />
      </StrictMode>
    )
    await vi.waitFor(() =>
      expect(rendered.container.querySelectorAll('iframe')).toHaveLength(1)
    )
    const iframe = rendered.container.querySelector('iframe')
    rendered.rerender(
      <StrictMode>
        <EmailCanvas
          emailId="e"
          getSession={() => Promise.resolve(session)}
          onSaved={() => {}}
        />
      </StrictMode>
    )
    expect(rendered.container.querySelector('iframe')).toBe(iframe)
    rendered.unmount()
    expect(document.querySelector('iframe')).toBeNull()
  })
})
