'use client'

import type { BrewEmbedError } from '@brew.new/sdk/embed'
import { EmailCanvas, type EmailCanvasHandle } from '@brew.new/sdk/react'
import { useEffect, useRef, useState } from 'react'
import type { DemoTarget } from '../lib/config'

type Props = Readonly<{
  targets: ReadonlyArray<DemoTarget>
  embedOrigin: string
  clientId: string
}>

function CanvasView({
  item,
  embedOrigin,
  clientId,
  onLeave,
}: Readonly<{
  item: DemoTarget
  embedOrigin: string
  clientId: string
  onLeave: () => void
}>) {
  const canvas = useRef<EmailCanvasHandle>(null)
  const [isReady, setIsReady] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [selected, setSelected] = useState(0)
  useEffect(() => {
    if (!isDirty) {
      return
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])
  async function perform(action: 'save' | 'fit' | 'leave') {
    setIsBusy(true)
    setError(null)
    try {
      if (action === 'fit') {
        await canvas.current?.fitView()
      } else {
        if (isReady || isDirty) {
          await canvas.current?.flush()
        }
        if (action === 'leave') {
          onLeave()
        }
      }
    } catch (cause) {
      if (cause instanceof Error) {
        setError(cause.message)
      } else {
        setError('Please try again.')
      }
    } finally {
      setIsBusy(false)
    }
  }
  function report(cause: BrewEmbedError) {
    setError(cause.message)
    if (
      ['AUTHENTICATION_FAILED', 'SESSION_EXPIRED', 'DESTROYED'].includes(
        cause.code
      )
    ) {
      setIsReady(false)
    }
  }
  const targetProps =
    item.target.type === 'group'
      ? { groupId: item.target.groupId }
      : { emailId: item.target.emailId }
  function statusText() {
    if (isBusy) {
      return 'Working…'
    }
    if (error && !isReady) {
      return 'Canvas connection needs attention'
    }
    if (!isReady) {
      return 'Connecting to your canvas…'
    }
    if (isDirty) {
      return 'Unsaved changes'
    }
    if (saved) {
      return `Saved at ${saved}`
    }
    return 'Ready · Changes save automatically'
  }
  let recoveryText = 'Return to workspaces and reopen to retry.'
  if (isDirty) {
    recoveryText = isReady
      ? 'Your changes are still here. Retry Save now before leaving.'
      : 'Keep this tab open while restoring access. Reloading may lose unsaved changes.'
  }
  return (
    <>
      <header className="toolbar">
        <div>
          <p className="eyebrow">Shared email workspace</p>
          <h1>{item.label}</h1>
        </div>
        <div className="actions">
          <button
            type="button"
            disabled={!isReady || isBusy}
            onClick={() => void perform('fit')}
          >
            Fit canvas
          </button>
          <button
            type="button"
            disabled={!isReady || isBusy}
            onClick={() => void perform('save')}
          >
            Save now
          </button>
          <button
            type="button"
            disabled={isBusy || (!isReady && isDirty)}
            onClick={() => void perform('leave')}
          >
            Back to workspaces
          </button>
        </div>
      </header>
      <div className="status" role="status" aria-live="polite">
        {statusText()}
        {selected > 0 ? ` · ${selected} selected` : ''}
      </div>
      {error ? (
        <div className="error" role="alert">
          <strong>Canvas needs attention</strong>
          <p>{error}</p>
          <p>{recoveryText}</p>
        </div>
      ) : null}
      <div inert={isBusy}>
        <EmailCanvas
          {...targetProps}
          ref={canvas}
          embedOrigin={embedOrigin}
          title={item.label}
          className="canvas"
          style={{ height: 'calc(100dvh - 230px)', minHeight: 420 }}
          clientId={clientId}
          onReady={() => {
            setIsReady(true)
            setError(null)
          }}
          onDirtyChange={setIsDirty}
          onSelectionChange={(ids) => setSelected(ids.length)}
          onSaved={() => setSaved(new Date().toLocaleTimeString())}
          onError={report}
        />
      </div>
      <p className="hint">
        Select an email to edit its text or open the properties panel when
        editing is enabled. Other viewers see saved changes live; one person
        edits each email at a time.
      </p>
    </>
  )
}

export function CanvasDemo({ targets, embedOrigin, clientId }: Props) {
  const [active, setActive] = useState<DemoTarget | null>(null)
  return (
    <main className="workspace">
      {active ? (
        <CanvasView
          item={active}
          embedOrigin={embedOrigin}
          clientId={clientId}
          onLeave={() => setActive(null)}
        />
      ) : (
        <>
          <p className="eyebrow">Brew SDK example</p>
          <h1>Your email workspace, inside your app.</h1>
          <p className="intro">
            Choose a campaign to review together, or focus on a single email.
            Access uses your client ID and its allowed domains.
          </p>
          <div className="cards">
            {targets.map((item) => (
              <button
                type="button"
                className="card"
                key={JSON.stringify(item.target)}
                onClick={() => setActive(item)}
              >
                <span>{item.label}</span>
                <p>
                  {item.target.type === 'group'
                    ? 'See emails stream into one campaign group.'
                    : 'Review and edit just one email.'}
                </p>
                <strong>Open workspace →</strong>
              </button>
            ))}
          </div>
          <p className="hint">
            Open a second tab to try collaboration. Changes save automatically;
            use Save now before returning here.
          </p>
        </>
      )}
    </main>
  )
}
