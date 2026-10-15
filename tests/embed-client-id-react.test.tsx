// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { EmailCanvas, type EmailCanvasProps } from '../src/react/index'
import { createEmailCanvas } from '../src/embed/controller'

const clientId = 'brew_client_0123456789abcdef0123456789abcdef'
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
it('uses clientId as the only required authentication prop and replaces sessions when it changes', async () => {
  let grants = 0
  const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
    if (init?.method === 'DELETE')
      return Promise.resolve(new Response(null, { status: 204 }))
    grants += 1
    const sessionId = `session_${grants}`
    return Promise.resolve(
      Response.json({
        sessionId,
        target: { type: 'email', emailId: 'email_a' },
        embedUrl: `https://brew.new/embed/canvas/${sessionId}`,
        bootstrapToken: 'bootstrap',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })
    )
  })
  vi.stubGlobal('fetch', fetcher)
  const view = render(
    <StrictMode>
      <EmailCanvas clientId={clientId} emailId="email_a" />
    </StrictMode>
  )
  await waitFor(() =>
    expect(view.container.querySelectorAll('iframe')).toHaveLength(1)
  )
  const first = view.container.querySelector('iframe')
  view.rerender(
    <StrictMode>
      <EmailCanvas
        clientId="brew_client_fedcba9876543210fedcba9876543210"
        emailId="email_a"
      />
    </StrictMode>
  )
  await waitFor(() =>
    expect(view.container.querySelector('iframe')).not.toBe(first)
  )
  await waitFor(() =>
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === 'DELETE').length
    ).toBeGreaterThanOrEqual(2)
  )
  view.unmount()
  await waitFor(() =>
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === 'DELETE')
    ).toHaveLength(3)
  )
})
it('rejects API keys and missing client IDs synchronously in the controller', () => {
  const node = document.createElement('div')
  expect(() =>
    createEmailCanvas(node, { clientId: 'brew_api_secret', groupId: 'grp_a' })
  ).toThrow(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
  // @ts-expect-error Browser authentication is required.
  expect(() => createEmailCanvas(node, { groupId: 'grp_a' })).toThrow(
    expect.objectContaining({ code: 'INVALID_ARGUMENT' })
  )
})
it('rejects conflicting authentication props instead of dropping a per-user authorization callback', () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(null, { status: 403 }))
  vi.stubGlobal('fetch', fetcher)
  // @ts-expect-error Deliberately model a JavaScript host passing both authentication options.
  const invalid: EmailCanvasProps = {
    clientId,
    emailId: 'email_a',
    getSession: vi.fn(),
  }
  expect(() => render(<EmailCanvas {...invalid} />)).toThrow(
    expect.objectContaining({ code: 'INVALID_ARGUMENT' })
  )
})
