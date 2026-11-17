import { expect, it } from 'vitest'

import type { AuditEmailInput } from '../../../src/resources/emails/audit'

it('accepts exactly one audit source, including values assigned through variables', () => {
  const html: AuditEmailInput = { emailHtml: '<p>Hello</p>' }
  const jsx: AuditEmailInput = { emailJsx: '<Text>Hello</Text>' }
  const saved: AuditEmailInput = {
    emailId: 'design',
    emailVersionId: 'version',
  }
  const both = { emailHtml: '<p>Hello</p>', emailId: 'design' }
  // @ts-expect-error An audit takes one source even through a non-literal value.
  const rejected: AuditEmailInput = both
  const noSource = { subject: 'Hello' }
  // @ts-expect-error A source is required.
  const missing: AuditEmailInput = noSource
  expect([html, jsx, saved, rejected, missing]).toHaveLength(5)
})
