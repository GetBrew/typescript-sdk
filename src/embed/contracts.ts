// Generated from brew-v2/lib/embed/contracts.ts. Do not edit.
import { isRecord } from './is-record'
/** Canonical browser-safe embed protocol. Vendored into the public SDK by sync-embed-contracts.mjs. */
export const CANVAS_PROTOCOL = 'brew.canvas.v1' as const
export type CanvasTarget =
  | Readonly<{ type: 'group'; groupId: string }>
  | Readonly<{ type: 'email'; emailId: string }>
export type CanvasTargetProps =
  | Readonly<{ groupId: string; emailId?: never }>
  | Readonly<{ emailId: string; groupId?: never }>
export type CanvasPermission = 'read' | 'edit' | 'presence'
export type CanvasSession = Readonly<{
  sessionId: string
  embedUrl: string
  bootstrapToken: string
  expiresAt: number
  target: CanvasTarget
}>
export type CreateCanvasSessionInput = Readonly<{
  target: CanvasTarget
  user: Readonly<{ externalId: string; name: string }>
  parentOrigin: string
  permissions?: ReadonlyArray<CanvasPermission>
}>
export type CanvasSavedEvent = Readonly<{
  emailId: string
  emailVersionId: string | null
  updatedAt: string
}>
export type CanvasErrorCode =
  | 'INVALID_ARGUMENT'
  | 'AUTHENTICATION_FAILED'
  | 'SESSION_EXPIRED'
  | 'CONNECTION_FAILED'
  | 'COMMAND_FAILED'
  | 'DESTROYED'
export class BrewEmbedError extends Error {
  readonly code: CanvasErrorCode
  constructor(code: CanvasErrorCode, message: string) {
    super(message)
    this.name = 'BrewEmbedError'
    this.code = code
  }
}
export function resolveCanvasTarget(input: {
  groupId?: string
  emailId?: string
}): CanvasTarget {
  if ((input.groupId !== undefined) === (input.emailId !== undefined)) {
    throw new BrewEmbedError(
      'INVALID_ARGUMENT',
      'Pass exactly one groupId or emailId.'
    )
  }
  const id = input.emailId ?? input.groupId
  if (typeof id !== 'string' || !id || id.trim() !== id || id.length > 200) {
    throw new BrewEmbedError(
      'INVALID_ARGUMENT',
      'Canvas identifiers must be nonempty and at most 200 characters.'
    )
  }
  return input.emailId
    ? { type: 'email', emailId: id }
    : { type: 'group', groupId: id }
}
export function sameCanvasTarget(a: CanvasTarget, b: CanvasTarget): boolean {
  if (a.type === 'group' && b.type === 'group') {
    return a.groupId === b.groupId
  }
  if (a.type === 'email' && b.type === 'email') {
    return a.emailId === b.emailId
  }
  return false
}
export type CanvasCommand =
  | Readonly<{ type: 'fit' }>
  | Readonly<{ type: 'focus'; emailId: string }>
  | Readonly<{ type: 'flush' }>
export type CanvasHostMessage = Readonly<{
  protocol: typeof CANVAS_PROTOCOL
  instanceId: string
}> &
  (
    | Readonly<{ type: 'authenticate'; bootstrapToken: string }>
    | Readonly<{ type: 'command'; requestId: string; command: CanvasCommand }>
  )
export type CanvasFrameMessage = Readonly<{
  protocol: typeof CANVAS_PROTOCOL
  instanceId: string
}> &
  (
    | Readonly<{ type: 'handshake' | 'ready' | 'renew' }>
    | Readonly<{ type: 'saved'; saved: CanvasSavedEvent }>
    | Readonly<{ type: 'dirty'; hasUnsavedEdits: boolean }>
    | Readonly<{ type: 'selection'; emailIds: ReadonlyArray<string> }>
    | Readonly<{ type: 'error'; code: CanvasErrorCode; message: string }>
    | Readonly<{ type: 'result'; requestId: string; error?: string }>
  )
function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 2000
}
function isEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value.protocol === CANVAS_PROTOCOL &&
    isString(value.instanceId)
  )
}
export function isCanvasTarget(value: unknown): value is CanvasTarget {
  if (!isRecord(value)) {
    return false
  }
  if (value.type === 'group') {
    return isString(value.groupId)
  }
  return value.type === 'email' && isString(value.emailId)
}
export function isCanvasSession(value: unknown): value is CanvasSession {
  return (
    isRecord(value) &&
    isString(value.sessionId) &&
    isString(value.embedUrl) &&
    isString(value.bootstrapToken) &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    isCanvasTarget(value.target)
  )
}
export function isCanvasHostMessage(
  value: unknown
): value is CanvasHostMessage {
  if (!isEnvelope(value)) {
    return false
  }
  if (value.type === 'authenticate') {
    return isString(value.bootstrapToken)
  }
  if (
    value.type !== 'command' ||
    !isString(value.requestId) ||
    !isRecord(value.command)
  ) {
    return false
  }
  return (
    value.command.type === 'fit' ||
    value.command.type === 'flush' ||
    (value.command.type === 'focus' && isString(value.command.emailId))
  )
}
export function isCanvasFrameMessage(
  value: unknown
): value is CanvasFrameMessage {
  if (!isEnvelope(value)) {
    return false
  }
  switch (value.type) {
    case 'handshake':
    case 'ready':
    case 'renew':
      return true
    case 'dirty':
      return typeof value.hasUnsavedEdits === 'boolean'
    case 'selection':
      return (
        Array.isArray(value.emailIds) &&
        value.emailIds.length <= 100 &&
        value.emailIds.every(isString)
      )
    case 'saved':
      return (
        isRecord(value.saved) &&
        isString(value.saved.emailId) &&
        (value.saved.emailVersionId === null ||
          isString(value.saved.emailVersionId)) &&
        isString(value.saved.updatedAt)
      )
    case 'result':
      return (
        isString(value.requestId) &&
        (value.error === undefined || isString(value.error))
      )
    case 'error':
      return (
        isString(value.message) &&
        [
          'INVALID_ARGUMENT',
          'AUTHENTICATION_FAILED',
          'SESSION_EXPIRED',
          'CONNECTION_FAILED',
          'COMMAND_FAILED',
          'DESTROYED',
        ].includes(String(value.code))
      )
    default:
      return false
  }
}
