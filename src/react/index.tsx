'use client'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from 'react'
import {
  BrewEmbedError,
  createEmailCanvas,
  resolveCanvasTarget,
  type EmailCanvasController,
  type EmailCanvasOptions,
  type CanvasSessionRequest,
} from '../embed/index'
import { validateCanvasAuthentication } from '../embed/controller'
export type EmailCanvasProps = EmailCanvasOptions & {
  readonly className?: string
  readonly style?: CSSProperties
}
export type EmailCanvasHandle = Omit<EmailCanvasController, 'destroy'>
const useCommittedEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect
export const EmailCanvas = forwardRef<EmailCanvasHandle, EmailCanvasProps>(
  function EmailCanvas(props, ref) {
    validateCanvasAuthentication(props)
    const container = useRef<HTMLDivElement>(null)
    const controller = useRef<EmailCanvasController | null>(null)
    const latest = useRef(props)
    useCommittedEffect(() => {
      latest.current = props
    })
    useImperativeHandle(ref, () => {
      function current(): EmailCanvasController {
        if (!controller.current)
          throw new BrewEmbedError(
            'CONNECTION_FAILED',
            'The canvas has not mounted.'
          )
        return controller.current
      }
      return {
        fitView: async () => current().fitView(),
        focusEmail: async (id) => current().focusEmail(id),
        flush: async () => current().flush(),
      }
    }, [])
    useEffect(() => {
      if (!container.current) return
      const { embedOrigin, title, commandTimeoutMs, clientId } = latest.current
      const authentication =
        clientId !== undefined
          ? { clientId }
          : {
              getSession: (request: CanvasSessionRequest) => {
                const provider = latest.current.getSession
                if (!provider)
                  return Promise.reject(
                    new BrewEmbedError(
                      'INVALID_ARGUMENT',
                      'Canvas authentication is required.'
                    )
                  )
                return provider(request)
              },
            }
      const resolved = resolveCanvasTarget(latest.current)
      const target =
        resolved.type === 'email'
          ? { emailId: resolved.emailId }
          : { groupId: resolved.groupId }
      const mounted = createEmailCanvas(container.current, {
        ...target,
        ...authentication,
        ...(embedOrigin ? { embedOrigin } : {}),
        ...(title ? { title } : {}),
        ...(commandTimeoutMs !== undefined ? { commandTimeoutMs } : {}),
        onReady: () => latest.current.onReady?.(),
        onSaved: (event) => latest.current.onSaved?.(event),
        onSelectionChange: (ids) => latest.current.onSelectionChange?.(ids),
        onDirtyChange: (isDirty) => latest.current.onDirtyChange?.(isDirty),
        onError: (error) => latest.current.onError?.(error),
      })
      controller.current = mounted
      return () => {
        mounted.destroy()
        controller.current = null
      }
    }, [props.groupId, props.emailId, props.embedOrigin, props.clientId])
    return (
      <div
        ref={container}
        className={props.className}
        style={{ height: 640, ...props.style }}
      />
    )
  }
)
