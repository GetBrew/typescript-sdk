import type { EmailCanvasProps } from '@brew.new/sdk/react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasDemo } from '../components/canvas-demo'

const mock = vi.hoisted(() => ({
  flush: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  destroy: vi.fn(async () => undefined),
  props: null as EmailCanvasProps | null,
  getSession: vi.fn(),
  createBridge: vi.fn(),
}))
vi.mock('../lib/session-bridge', () => ({
  createSessionBridge: mock.createBridge,
}))
beforeEach(() => {
  mock.createBridge.mockImplementation(() => ({
    getSession: mock.getSession,
    close: mock.close,
    destroy: mock.destroy,
  }))
})
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
  it('waits for a previous Strict Mode bridge to finish cleanup before sign-out', async () => {
    let finish: (() => void) | undefined
    const previousCleanup = new Promise<void>((resolve) => {
      finish = resolve
    })
    const oldClose = vi.fn(() => previousCleanup)
    mock.createBridge.mockImplementationOnce(() => ({
      getSession: mock.getSession,
      close: oldClose,
      destroy: () => previousCleanup,
    }))
    const signOut = vi.fn(async () => undefined)
    render(
      <StrictMode>
        <CanvasDemo {...props} onSignOut={signOut} />
      </StrictMode>
    )
    fireEvent.click(screen.getByRole('button', { name: /Campaign group/ }))
    act(() => mock.props?.onReady?.())
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    try {
      expect(signOut).not.toHaveBeenCalled()
    } finally {
      finish?.()
    }
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce())
    expect(oldClose).toHaveBeenCalled()
  })
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
