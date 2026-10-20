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
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CanvasDemo } from '../components/canvas-demo'

const mock = vi.hoisted(() => ({
  flush: vi.fn<() => Promise<void>>(async () => undefined),
  fit: vi.fn<() => Promise<void>>(async () => undefined),
  props: null as EmailCanvasProps | null,
}))
vi.mock('@brew.new/sdk/react', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    EmailCanvas: forwardRef(function FakeCanvas(props: EmailCanvasProps, ref) {
      mock.props = props
      useImperativeHandle(ref, () => ({
        flush: mock.flush,
        fitView: mock.fit,
        focusEmail: vi.fn(),
      }))
      return <div data-testid="canvas" />
    }),
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const props = {
  clientId: 'brew_client_0123456789abcdef0123456789abcdef',
  targets: [
    {
      label: 'Campaign group',
      target: { type: 'group', groupId: 'group' } as const,
    },
  ],
  embedOrigin: 'https://brew.new',
}
function open() {
  render(
    <StrictMode>
      <CanvasDemo {...props} />
    </StrictMode>
  )
  fireEvent.click(screen.getByRole('button', { name: /Campaign group/ }))
  act(() => mock.props?.onReady?.())
}
describe('client ID customer flow', () => {
  it('passes only the client ID and exclusive target to the SDK', () => {
    open()
    expect(mock.props?.clientId).toBe(props.clientId)
    expect(mock.props?.groupId).toBe('group')
    expect(mock.props).not.toHaveProperty('getSession')
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull()
  })
  it('waits for save before unmounting the canvas on exit', async () => {
    open()
    let finish: (() => void) | undefined
    mock.flush.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back to workspaces' }))
    expect(screen.getByTestId('canvas')).toBeTruthy()
    await act(async () => finish?.())
    await screen.findByRole('button', { name: /Campaign group/ })
    expect(mock.flush).toHaveBeenCalledOnce()
  })
  it('preserves unsaved edits after a failed save', async () => {
    open()
    act(() => mock.props?.onDirtyChange?.(true))
    mock.flush.mockRejectedValueOnce(new Error('Save conflict'))
    fireEvent.click(screen.getByRole('button', { name: 'Back to workspaces' }))
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Save conflict')
    )
    expect(screen.getByTestId('canvas')).toBeTruthy()
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Save now' }) as HTMLButtonElement)
          .disabled
      ).toBe(false)
    )
  })
  it('warns on page exit while edits are unsaved', () => {
    open()
    act(() => mock.props?.onDirtyChange?.(true))
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
