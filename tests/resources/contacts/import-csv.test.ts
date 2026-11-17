import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import {
  createImportCsvContacts,
  type ImportCsvContactsResponse,
  type ImportCsvWarning,
} from '../../../src/resources/contacts/import-csv'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const CSV = 'Email,Signup Date\nada@example.com,03/04/2026'

function envelope(
  warnings: ReadonlyArray<ImportCsvWarning> = []
): ImportCsvContactsResponse {
  return {
    summary: { inserted: 1, updated: 0, failed: 0, skipped: 0, total: 1 },
    fieldsCreated: ['signupDate'],
    errors: [],
    warnings: [...warnings],
    importId: 'imp_csv',
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
    expect(result.summary.total).toBe(1)
    expect(result.importId).toBe('imp_csv')
  })

  it('preserves row receipts and an aggregate skipped-row warning on 207', async () => {
    const body = {
      ...envelope(),
      summary: { inserted: 1, updated: 0, failed: 1, skipped: 101, total: 103 },
      errors: [
        {
          email: 'refused@example.com',
          row: 103,
          code: 'FIELD_TYPE_MISMATCH',
          field: 'customFields.plan',
          message: 'The plan field requires a number.',
        },
      ],
      warnings: [
        ...Array.from({ length: 100 }, (_, index) => ({
          code: 'CSV_ROW_SKIPPED',
          row: index + 1,
          message: `Row ${index + 1} has no email address, so it was skipped.`,
        })),
        {
          code: 'CSV_ROW_SKIPPED',
          message: '1 more row was skipped; only the first 100 are listed.',
        },
      ],
    } satisfies ImportCsvContactsResponse
    server.use(
      http.post('https://brew.new/api/v1/contacts/import-csv', () =>
        HttpResponse.json(body, { status: 207 })
      )
    )

    const { client } = makeTestHttpClient()
    const result = await createImportCsvContacts(client)({
      csv: [
        'email,plan',
        ...Array.from({ length: 101 }, (_, index) => `,${index}`),
        'ada@example.com,1',
        'refused@example.com,trial',
      ].join('\n'),
    })

    expect(result.summary.total).toBe(103)
    expect(result.errors[0]?.row).toBe(103)
    expect(result.warnings[0]?.row).toBe(1)
    expect(result.warnings).toHaveLength(101)
    expect(result.warnings.at(-1)?.row).toBeUndefined()
    expect(result).toEqual(body)
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
