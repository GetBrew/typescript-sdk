import { describe, expect, it } from 'vitest'
import { getCanvasRecoveryId } from '../src/embed/recovery-identity'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}
describe('browser recovery identity', () => {
  it('survives SDK destruction and reopening for the same client app', () => {
    const storage = memoryStorage()
    const first = getCanvasRecoveryId({ clientId: 'app_a', storage })
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(getCanvasRecoveryId({ clientId: 'app_a', storage })).toBe(first)
    expect(getCanvasRecoveryId({ clientId: 'app_b', storage })).not.toBe(first)
  })
  it('keeps the canvas usable when browser storage is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new Error('Storage denied')
      },
      setItem: () => {
        throw new Error('Storage denied')
      },
    }
    expect(getCanvasRecoveryId({ clientId: 'app_a', storage })).toMatch(
      /^[0-9a-f-]{36}$/
    )
  })
  it('replaces malformed local identity values', () => {
    const storage = {
      getItem: () => 'not-a-valid-identity',
      setItem: () => {},
    }
    expect(getCanvasRecoveryId({ clientId: 'app_a', storage })).toMatch(
      /^[0-9a-f-]{36}$/
    )
  })
})
