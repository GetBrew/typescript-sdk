import type { EmailCanvasProps } from '@brew.new/sdk/react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CanvasDemo } from '../components/canvas-demo'

const mock = vi.hoisted(() => ({
  flush: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  props: null as EmailCanvasProps | null,
  getSession: vi.fn(),
}))
vi.mock('../lib/session-bridge', () => ({
  createSessionBridge: () => ({
    getSession: mock.getSession,
    close: mock.close,
  }),
}))
vi.mock('@brew.new/sdk/react', async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import('react')
  return {
    EmailCanvas: forwardRef(function FakeCanvas(props: EmailCanvasProps, ref) {
      mock.props = props
      useImperativeHandle(ref, () => ({
        flush: mock.flush,
        fitView: vi.fn(),
        focusEmail: vi.fn(),
      }))
      useEffect(() => {
        void props.getSession({
          target: { type: 'group', groupId: 'group' },
          signal: new AbortController().signal,
        })
      }, [])
      return <div data-testid="canvas" />
    }),
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const props = {
  targets: [
    {
      label: 'Campaign group',
      target: { type: 'group', groupId: 'group' } as const,
    },
  ],
  embedOrigin: 'https://brew.new',
  canEdit: true,
}
describe('Customer workspace flow', () => {
  it('saves and revokes before signing out', async () => {
    const signOut = vi.fn(async () => undefined)
    render(<CanvasDemo {...props} onSignOut={signOut} />)
    fireEvent.click(screen.getByRole('button', { name: /Campaign group/ }))
    act(() => mock.props?.onReady?.())
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
    expect(mock.flush.mock.invocationCallOrder[0]).toBeLessThan(
      mock.close.mock.invocationCallOrder[0] ?? 0
    )
    expect(mock.close.mock.invocationCallOrder[0]).toBeLessThan(
      signOut.mock.invocationCallOrder[0] ?? 0
    )
  })
  it('authorizes on mount even when child effects run first', async () => {
    render(<CanvasDemo {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Campaign group/ }))
    await waitFor(() => expect(mock.getSession).toHaveBeenCalledOnce())
  })
  it('keeps the editor and unsaved changes when flush fails', async () => {
    render(<CanvasDemo {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Campaign group/ }))
    act(() => {
      mock.props?.onReady?.()
      mock.props?.onDirtyChange?.(true)
    })
    mock.flush.mockRejectedValueOnce(new Error('Save conflict'))
    fireEvent.click(screen.getByRole('button', { name: 'Back to workspaces' }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Save conflict')
    )
    expect(screen.getByTestId('canvas')).toBeTruthy()
    expect(mock.close).not.toHaveBeenCalled()
  })
  it('flushes then revokes before returning to the chooser', async () => {
    render(<CanvasDemo {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Campaign group/ }))
    act(() => mock.props?.onReady?.())
    mock.flush.mockResolvedValueOnce(undefined)
    mock.close.mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Back to workspaces' }))
    await screen.findByRole('button', { name: /Campaign group/ })
    expect(mock.flush.mock.invocationCallOrder[0]).toBeLessThan(
      mock.close.mock.invocationCallOrder[0] ?? 0
    )
  })
})
