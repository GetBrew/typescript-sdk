import { CANVAS_RECOVERY_ID_PATTERN } from './contracts'

/** First-party, per-client draft identity. It confers no session ownership or access. */
export function getCanvasRecoveryId(
  options: Readonly<{
    clientId: string
    storage?: Pick<Storage, 'getItem' | 'setItem'>
  }>
): string {
  try {
    const storage = options.storage ?? globalThis.localStorage
    const key = `brew.canvas.recovery.v1:${options.clientId}`
    const existing = storage?.getItem(key)
    if (existing && CANVAS_RECOVERY_ID_PATTERN.test(existing)) return existing
    const recoveryId = globalThis.crypto.randomUUID()
    storage?.setItem(key, recoveryId)
    return recoveryId
  } catch {
    // Storage-denied browsers can still use the canvas, without cross-reload recovery.
    return globalThis.crypto.randomUUID()
  }
}
