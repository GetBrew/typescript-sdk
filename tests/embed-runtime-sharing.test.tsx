// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { BrewEmbedError } from '../dist/embed.js'
import { EmailCanvas } from '../dist/react.js'

afterEach(cleanup)
it('preserves typed errors across the React and browser package entries', async () => {
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
