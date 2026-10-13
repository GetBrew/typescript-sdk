// @vitest-environment jsdom
import { StrictMode, useLayoutEffect, useRef } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmailCanvas, type EmailCanvasHandle } from '../src/react'
afterEach(cleanup)
describe('React email canvas', () => {
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
      expiresAt: Date.now() + 60_000,
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
