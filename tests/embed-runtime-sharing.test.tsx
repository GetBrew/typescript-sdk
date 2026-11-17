// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import type * as EmbedEntry from '../src/embed/index'
import type * as ReactEntry from '../src/react/index'

afterEach(cleanup)
it('preserves typed errors across the React and browser package entries', async () => {
  const { BrewEmbedError } = (await import(
    new URL('../dist/embed.js', import.meta.url).pathname
  )) as typeof EmbedEntry
  const { EmailCanvas } = (await import(
    new URL('../dist/react.js', import.meta.url).pathname
  )) as typeof ReactEntry
  const onError = vi.fn()
  render(
    createElement(EmailCanvas, {
      emailId: 'email_a',
      onError,
      getSession: () =>
        Promise.reject(new BrewEmbedError('CONNECTION_FAILED', 'offline')),
    })
  )
  await waitFor(() => expect(onError).toHaveBeenCalledOnce())
  const error: unknown = onError.mock.calls[0]?.[0]
  expect(error).toBeInstanceOf(BrewEmbedError)
  expect(error).toMatchObject({ code: 'CONNECTION_FAILED', message: 'offline' })
})
it('preserves the public error class when JavaScript supplies conflicting React authentication props', async () => {
  const { BrewEmbedError } = (await import(
    new URL('../dist/embed.js', import.meta.url).pathname
  )) as typeof EmbedEntry
  const { EmailCanvas } = (await import(
    new URL('../dist/react.js', import.meta.url).pathname
  )) as typeof ReactEntry
  // @ts-expect-error Deliberately model an untyped host passing both authentication modes.
  const invalid: ReactEntry.EmailCanvasProps = {
    clientId: 'brew_client_0123456789abcdef0123456789abcdef',
    emailId: 'email_a',
    getSession: () =>
      Promise.reject(new BrewEmbedError('AUTHENTICATION_FAILED', 'unused')),
  }
  let failure: unknown
  try {
    render(createElement(EmailCanvas, invalid))
  } catch (error) {
    failure = error
  }
  expect(failure).toBeInstanceOf(BrewEmbedError)
  expect(failure).toMatchObject({ code: 'INVALID_ARGUMENT' })
})
