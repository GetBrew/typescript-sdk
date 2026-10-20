import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createImportContacts } from '../../../src/resources/contacts/import'
import { createImportCsvContacts } from '../../../src/resources/contacts/import-csv'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const ENVELOPE = {
  summary: { inserted: 1, updated: 1, failed: 0, skipped: 0 },
  fieldsCreated: [],
  errors: [],
  warnings: [],
  importId: 'imp_123',
}

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
  })

  it('returns the partial-success envelope without throwing on 207', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts/import', () =>
        HttpResponse.json(
          {
            ...ENVELOPE,
            summary: { inserted: 1, updated: 0, failed: 1, skipped: 0 },
            errors: [
              {
                email: 'not-an-email',
                code: 'INVALID_EMAIL',
                message: "'not-an-email' is not a valid email address.",
              },
            ],
          },
          { status: 207 }
        )
      )
    )
    const { client } = makeTestHttpClient()
    const result = await createImportContacts(client)({
      contacts: [{ email: 'ada@example.com' }, { email: 'not-an-email' }],
    })
    expect(result.summary.failed).toBe(1)
    expect(result.errors[0]?.code).toBe('INVALID_EMAIL')
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
          return HttpResponse.json(ENVELOPE)
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
  })
})
