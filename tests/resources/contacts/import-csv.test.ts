import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { createImportCsvContacts } from '../../../src/resources/contacts/import-csv'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const CSV = 'Email,Signup Date\nada@example.com,03/04/2026'

function envelope(warnings: ReadonlyArray<Record<string, string>> = []) {
  return {
    summary: { inserted: 1, updated: 0, failed: 0, skipped: 0 },
    fieldsCreated: ['signupDate'],
    errors: [],
    warnings,
  }
}

describe('contacts.importCsv', () => {
  it('sends dateOrder and consent with the CSV', async () => {
    let sent: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/contacts/import-csv',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json(envelope())
        }
      )
    )
    const { client } = makeTestHttpClient()
    const importCsv = createImportCsvContacts(client)

    const result = await importCsv({
      csv: CSV,
      dateOrder: 'day_first',
      consent: { source: 'import' },
    })

    expect(sent).toEqual({
      csv: CSV,
      dateOrder: 'day_first',
      consent: { source: 'import' },
    })
    expect(result.summary.inserted).toBe(1)
  })

  it('surfaces the DATE_ORDER_ASSUMED warning when the order was guessed', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts/import-csv', () =>
        HttpResponse.json(
          envelope([
            {
              code: 'DATE_ORDER_ASSUMED',
              field: 'signupDate',
              message: 'Read 03/04/2026 month-first; pass dateOrder.',
            },
          ])
        )
      )
    )
    const { client } = makeTestHttpClient()
    const importCsv = createImportCsvContacts(client)

    const result = await importCsv({ csv: CSV })

    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'DATE_ORDER_ASSUMED',
        field: 'signupDate',
      }),
    ])
  })

  it('types dateOrder as the two orders the API reads', () => {
    const { client } = makeTestHttpClient()
    const importCsv = createImportCsvContacts(client)
    // Type-level only: the call is never awaited against a server.
    const call = () =>
      // @ts-expect-error — `year_first` is not an order the API reads
      importCsv({ csv: CSV, dateOrder: 'year_first' })
    expect(typeof call).toBe('function')
  })
})
