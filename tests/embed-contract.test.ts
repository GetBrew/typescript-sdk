import { describe, expect, it } from 'vitest'

import { resolveCanvasTarget } from '../src/embed/target'
import { isCanvasSession } from '../src/embed/contracts'

describe('email canvas target', () => {
  it('accepts an ISO session expiry and rejects invalid dates', () => {
    const session = {
      sessionId: 'session_a',
      embedUrl: 'https://brew.new/embed/canvas/session_a',
      bootstrapToken: 'token',
      target: { type: 'email', emailId: 'email_a' },
      expiresAt: '2026-10-13T22:00:00.000Z',
    }
    expect(isCanvasSession(session)).toBe(true)
    expect(isCanvasSession({ ...session, expiresAt: 'invalid' })).toBe(false)
  })
  it('accepts exactly one group target', () => {
    expect(resolveCanvasTarget({ groupId: 'grp_example' })).toEqual({
      type: 'group',
      groupId: 'grp_example',
    })
  })

  it('accepts a single email instead of a group', () => {
    expect(resolveCanvasTarget({ emailId: 'email_example' })).toEqual({
      type: 'email',
      emailId: 'email_example',
    })
  })

  it('rejects ambiguous targets', () => {
    expect(() =>
      resolveCanvasTarget({ groupId: 'grp_example', emailId: 'email_example' })
    ).toThrow()
  })
  it('rejects a second target even when it is empty', () => {
    expect(() =>
      resolveCanvasTarget({ groupId: '', emailId: 'email_a' })
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
  })
  it('returns typed validation errors for invalid JavaScript identifiers', () => {
    expect(() =>
      // @ts-expect-error Deliberate invalid JavaScript input.
      resolveCanvasTarget({ emailId: 42 })
    ).toThrowError(expect.objectContaining({ code: 'INVALID_ARGUMENT' }))
  })
})
