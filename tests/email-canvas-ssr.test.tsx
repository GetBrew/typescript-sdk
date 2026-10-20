import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { EmailCanvas } from '../src/react'

it('renders on the server without warnings or requesting a session', () => {
  const onConsoleError = vi.spyOn(console, 'error')
  const getSession = vi.fn(() => new Promise<never>(() => {}))
  const html = renderToString(
    createElement(EmailCanvas, { emailId: 'synthetic-email', getSession })
  )
  expect(html).toContain('height:640px')
  expect(html).not.toContain('iframe')
  expect(getSession).not.toHaveBeenCalled()
  expect(onConsoleError).not.toHaveBeenCalled()
})
