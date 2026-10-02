import { describe, expect, it } from 'vitest'

import type { HttpClient, HttpRequestInput } from '../../src/core/http'
import {
  ADD_IMAGE_DEFAULT_TIMEOUT_MS,
  createAddImage,
} from '../../src/resources/content/add-image'
import {
  GENERATE_IMAGE_DEFAULT_TIMEOUT_MS,
  createGenerateImage,
} from '../../src/resources/content/generate-image'
import {
  GIF_DEFAULT_TIMEOUT_MS,
  createGif,
} from '../../src/resources/content/gif'
import {
  AUDIT_EMAIL_DEFAULT_TIMEOUT_MS,
  createAuditEmail,
} from '../../src/resources/emails/audit'
import {
  PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS,
  createPreviewEmailClients,
} from '../../src/resources/emails/client-previews'
import {
  EDIT_EMAIL_DEFAULT_TIMEOUT_MS,
  createEditEmail,
} from '../../src/resources/emails/edit'
import {
  IMPORT_FIGMA_DEFAULT_TIMEOUT_MS,
  createImportFigmaDesign,
} from '../../src/resources/emails/figma'
import {
  GENERATE_EMAIL_DEFAULT_TIMEOUT_MS,
  createGenerateEmail,
} from '../../src/resources/emails/generate'
import {
  IMPORT_EMAIL_DEFAULT_TIMEOUT_MS,
  createImportEmail,
} from '../../src/resources/emails/import'
import * as sdk from '../../src/index'

/**
 * Every method whose server work routinely outlasts the 30 s client default
 * carries its own per-call `timeoutMs`, and a caller-supplied one still
 * wins. Without it the call times out while the server keeps working; the
 * retry then finds the first attempt still holding its idempotency key and
 * the caller is left with a conflict for work that completes — and, for
 * credit-metered content, bills.
 */

/** An `HttpClient` that records each transport request into `calls`. */
function recordingClient({
  calls,
}: {
  calls: Array<HttpRequestInput>
}): HttpClient {
  return {
    request: <T>(input: HttpRequestInput) => {
      calls.push(input)
      return Promise.resolve({
        data: undefined as T,
        status: 200,
        headers: new Headers(),
        requestId: undefined,
      })
    },
    // None of these methods sends raw bytes.
    sendBytes: () => Promise.reject(new Error('unexpected sendBytes call')),
  }
}

type Case = {
  readonly name: string
  readonly defaultMs: number
  readonly expectedMs: number
  readonly call: (input: {
    client: HttpClient
    timeoutMs: number | undefined
  }) => Promise<unknown>
}

const withTimeout = ({
  timeoutMs,
}: {
  timeoutMs: number | undefined
}): { timeoutMs?: number } => (timeoutMs === undefined ? {} : { timeoutMs })

const CASES: ReadonlyArray<Case> = [
  {
    name: 'content.addImage',
    defaultMs: ADD_IMAGE_DEFAULT_TIMEOUT_MS,
    expectedMs: 300_000,
    call: ({ client, timeoutMs }) =>
      createAddImage(client)(
        { uploadId: 'imgup_abcdefghijklmnopqrstu' },
        withTimeout({ timeoutMs })
      ),
  },
  {
    name: 'content.gif',
    defaultMs: GIF_DEFAULT_TIMEOUT_MS,
    expectedMs: 300_000,
    call: ({ client, timeoutMs }) =>
      createGif(client)(
        { from: 'prompt', prompt: 'a cat' },
        withTimeout({ timeoutMs })
      ),
  },
  {
    name: 'content.generateImage',
    defaultMs: GENERATE_IMAGE_DEFAULT_TIMEOUT_MS,
    expectedMs: 180_000,
    call: ({ client, timeoutMs }) =>
      createGenerateImage(client)(
        { prompt: 'a cat' },
        withTimeout({ timeoutMs })
      ),
  },
  {
    name: 'emails.import',
    defaultMs: IMPORT_EMAIL_DEFAULT_TIMEOUT_MS,
    expectedMs: 300_000,
    call: ({ client, timeoutMs }) =>
      createImportEmail(client)(
        { format: 'html', content: '<p>Hi</p>' },
        withTimeout({ timeoutMs })
      ),
  },
  {
    name: 'emails.generate',
    defaultMs: GENERATE_EMAIL_DEFAULT_TIMEOUT_MS,
    expectedMs: 240_000,
    call: ({ client, timeoutMs }) =>
      createGenerateEmail(client)(
        { prompt: 'Welcome email' },
        withTimeout({ timeoutMs })
      ),
  },
  {
    name: 'emails.edit',
    defaultMs: EDIT_EMAIL_DEFAULT_TIMEOUT_MS,
    expectedMs: 240_000,
    call: ({ client, timeoutMs }) =>
      createEditEmail(client)(
        { emailId: 'email_1', prompt: 'Shorter' },
        withTimeout({ timeoutMs })
      ),
  },
  {
    name: 'emails.audit',
    defaultMs: AUDIT_EMAIL_DEFAULT_TIMEOUT_MS,
    expectedMs: 65_000,
    call: ({ client, timeoutMs }) =>
      createAuditEmail(client)(
        { emailHtml: '<p>Hi</p>' },
        withTimeout({ timeoutMs })
      ),
  },
  {
    name: 'emails.previewClients',
    defaultMs: PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS,
    expectedMs: 90_000,
    call: ({ client, timeoutMs }) =>
      createPreviewEmailClients(client)(
        { emailId: 'email_1' },
        withTimeout({ timeoutMs })
      ),
  },
  {
    name: 'emails.importFigma',
    defaultMs: IMPORT_FIGMA_DEFAULT_TIMEOUT_MS,
    expectedMs: 800_000,
    call: ({ client, timeoutMs }) =>
      createImportFigmaDesign(client)(
        {
          figmaUrl: 'https://www.figma.com/design/abc/Launch?node-id=1-2',
          format: 'html',
        },
        withTimeout({ timeoutMs })
      ),
  },
]

describe('long-running methods — per-call timeout defaults', () => {
  it.each(CASES)('$name defaults to its own timeout', async (testCase) => {
    const calls: Array<HttpRequestInput> = []
    const client = recordingClient({ calls })

    await testCase.call({ client, timeoutMs: undefined })

    expect(testCase.defaultMs).toBe(testCase.expectedMs)
    // Declared as a floor for the transport, not forced onto the request:
    // a longer client-wide timeoutMs must survive it.
    expect(calls[0]?.defaultTimeoutMs).toBe(testCase.expectedMs)
    expect(calls[0]?.options?.timeoutMs).toBeUndefined()
  })

  it.each(CASES)('$name lets the caller override it', async (testCase) => {
    const calls: Array<HttpRequestInput> = []
    const client = recordingClient({ calls })

    await testCase.call({ client, timeoutMs: 5_000 })

    expect(calls[0]?.options?.timeoutMs).toBe(5_000)
    expect(calls[0]?.defaultTimeoutMs).toBe(testCase.expectedMs)
  })

  it('exports every default from the package entry point', () => {
    expect(sdk.ADD_IMAGE_DEFAULT_TIMEOUT_MS).toBe(300_000)
    expect(sdk.GIF_DEFAULT_TIMEOUT_MS).toBe(300_000)
    expect(sdk.GENERATE_IMAGE_DEFAULT_TIMEOUT_MS).toBe(180_000)
    expect(sdk.IMPORT_EMAIL_DEFAULT_TIMEOUT_MS).toBe(300_000)
    expect(sdk.IMPORT_FIGMA_DEFAULT_TIMEOUT_MS).toBe(800_000)
    expect(sdk.GENERATE_EMAIL_DEFAULT_TIMEOUT_MS).toBe(240_000)
    expect(sdk.EDIT_EMAIL_DEFAULT_TIMEOUT_MS).toBe(240_000)
    expect(sdk.AUDIT_EMAIL_DEFAULT_TIMEOUT_MS).toBe(65_000)
    expect(sdk.PREVIEW_EMAIL_CLIENTS_DEFAULT_TIMEOUT_MS).toBe(90_000)
  })

  it('exports the transport error family from the package entry point', () => {
    expect(typeof sdk.BrewTransportError).toBe('function')
    expect(typeof sdk.BrewTimeoutError).toBe('function')
    expect(typeof sdk.BrewConnectionError).toBe('function')
    expect(typeof sdk.BrewParseError).toBe('function')
    expect(
      new sdk.BrewTimeoutError({
        method: 'GET',
        url: 'https://brew.new/api/v1/contacts',
        timeoutMs: 1,
        attempts: 1,
        idempotencyKey: undefined,
      })
    ).toBeInstanceOf(sdk.BrewTransportError)
  })
})
