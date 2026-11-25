import { CANVAS_RECOVERY_ID_PATTERN } from './contracts'

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
    return globalThis.crypto.randomUUID()
  }
}
