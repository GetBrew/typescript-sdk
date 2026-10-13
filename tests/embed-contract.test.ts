import { describe, expect, it } from 'vitest'

import { resolveCanvasTarget } from '../src/embed/target'

describe('email canvas target', () => {
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
