import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  createImportContacts,
  type ImportContactsResponse,
} from '../../../src/resources/contacts/import'
import { createImportCsvContacts } from '../../../src/resources/contacts/import-csv'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const ENVELOPE = {
  summary: { inserted: 1, updated: 1, failed: 0, skipped: 0, total: 2 },
  fieldsCreated: [],
  errors: [],
  warnings: [],
  importId: 'imp_123',
} satisfies ImportContactsResponse

describe('contacts.import', () => {
  it('posts JSON rows with fileName and consent and returns the importId', async () => {
    let sent: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/import',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json(ENVELOPE)
        }
      )
    )
    const { client } = makeTestHttpClient()
    const importContacts = createImportContacts(client)

    const result = await importContacts({
      contacts: [
        { email: 'ada@example.com', firstName: 'Ada' },
        { email: 'grace@example.com', customFields: { plan: 'pro' } },
      ],
      consent: { source: 'import' },
      fileName: 'crm-export.json',
    })

    expect(sent).toEqual({
      contacts: [
        { email: 'ada@example.com', firstName: 'Ada' },
        { email: 'grace@example.com', customFields: { plan: 'pro' } },
      ],
      consent: { source: 'import' },
      fileName: 'crm-export.json',
    })
    expect(result.importId).toBe('imp_123')
    expect(result.summary.updated).toBe(1)
    expect(result.summary.total).toBe(2)
  })

  it('returns the partial-success envelope without throwing on 207', async () => {
    const body = {
      ...ENVELOPE,
      summary: { inserted: 1, updated: 0, failed: 1, skipped: 0, total: 2 },
      errors: [
        {
          email: 'not-an-email',
          row: 2,
          code: 'INVALID_EMAIL',
          message: "'not-an-email' is not a valid email address.",
        },
      ],
    } satisfies ImportContactsResponse
    server.use(
      http.post('https://brew.new/api/v1/contacts/import', () =>
        HttpResponse.json(body, { status: 207 })
      )
    )
    const { client } = makeTestHttpClient()
    const result = await createImportContacts(client)({
      contacts: [{ email: 'ada@example.com' }, { email: 'not-an-email' }],
    })
    expect(result.summary.failed).toBe(1)
    expect(result.summary.total).toBe(2)
    expect(result.errors[0]?.code).toBe('INVALID_EMAIL')
    expect(result.errors[0]?.row).toBe(2)
    expect(result).toEqual(body)
  })
})

describe('contacts.importCsv fileName', () => {
  it('sends fileName so the batch is named in Import History', async () => {
    let sent: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/import-csv',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json({
            ...ENVELOPE,
            summary: {
              inserted: 1,
              updated: 0,
              failed: 0,
              skipped: 0,
              total: 1,
            },
          } satisfies ImportContactsResponse)
        }
      )
    )
    const { client } = makeTestHttpClient()
    const result = await createImportCsvContacts(client)({
      csv: 'email\nada@example.com',
      fileName: 'customers.csv',
    })
    expect(sent).toEqual({
      csv: 'email\nada@example.com',
      fileName: 'customers.csv',
    })
    expect(result.importId).toBe('imp_123')
    expect(result.summary.total).toBe(1)
  })
})

describe('contacts import dryRun and onConflict', () => {
  it('sends dryRun and returns the dry-run envelope without an importId', async () => {
    let sent: unknown
    const body = {
      summary: { inserted: 1, updated: 1, failed: 0, skipped: 0, total: 2 },
      fieldsCreated: ['plan'],
      errors: [],
      warnings: [],
      dryRun: true,
    } satisfies ImportContactsResponse
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/import',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json(body)
        }
      )
    )
    const { client } = makeTestHttpClient()
    const result = await createImportContacts(client)({
      contacts: [{ email: 'ada@example.com' }, { email: 'grace@example.com' }],
      dryRun: true,
    })
    expect(sent).toEqual({
      contacts: [{ email: 'ada@example.com' }, { email: 'grace@example.com' }],
      dryRun: true,
    })
    expect(result.dryRun).toBe(true)
    expect(result.importId).toBeUndefined()
    expect(result.fieldsCreated).toEqual(['plan'])
  })

  it('sends onConflict skip on a CSV import and reads the skipped row', async () => {
    let sent: unknown
    const body = {
      summary: { inserted: 1, updated: 0, failed: 0, skipped: 1, total: 2 },
      fieldsCreated: [],
      errors: [],
      warnings: [
        {
          code: 'CONTACT_EXISTS_SKIPPED',
          email: 'ada@example.com',
          row: 1,
          message:
            'ada@example.com already exists, so onConflict: "skip" left it unchanged.',
        },
      ],
      importId: 'imp_123',
    } satisfies ImportContactsResponse
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/import-csv',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json(body)
        }
      )
    )
    const { client } = makeTestHttpClient()
    const result = await createImportCsvContacts(client)({
      csv: 'email\nada@example.com\ngrace@example.com',
      onConflict: 'skip',
    })
    expect(sent).toEqual({
      csv: 'email\nada@example.com\ngrace@example.com',
      onConflict: 'skip',
    })
    expect(result.summary.skipped).toBe(1)
    expect(result.warnings[0]).toMatchObject({
      code: 'CONTACT_EXISTS_SKIPPED',
      row: 1,
    })
  })
})
