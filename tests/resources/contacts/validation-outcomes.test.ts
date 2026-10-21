import { http, HttpResponse } from 'msw'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createValidateContacts,
  type ContactValidationResult,
  type ValidateContactsResponse,
} from '../../../src/resources/contacts/validate'
import {
  createUpsertManyContacts,
  type UpsertManyContactsResponse,
} from '../../../src/resources/contacts/upsert-many'
import {
  createImportCsvContacts,
  type ImportCsvContactsResponse,
} from '../../../src/resources/contacts/import-csv'
import { makeTestHttpClient } from '../../helpers/http-client'
import { server } from '../../msw/server'

const response = {
  data: [
    {
      email: 'good@example.com',
      valid: true,
      status: 'valid',
      checkOutcome: 'completed',
      didYouMean: 'better@example.com',
    },
    {
      email: 'unknown@example.com',
      valid: false,
      status: 'risky',
      checkOutcome: 'unavailable',
      reason: 'validation_unavailable',
    },
  ],
  persistence: { matched: 1, modified: 0, failed: 1 },
} satisfies ValidateContactsResponse
const validation = {
  valid: 1,
  risky: 0,
  invalid: 0,
  unscored: 1,
  persistence: { matched: 1, modified: 0, failed: 1 },
}

describe('contact validation outcome contracts', () => {
  it('keeps unavailable checks compatible with the API risky status (type-level)', () => {
    expectTypeOf<
      Extract<
        ContactValidationResult,
        { checkOutcome: 'unavailable' }
      >['status']
    >().toEqualTypeOf<'risky'>()
  })
  it('preserves unavailable rows and failed saves in the response envelope', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts/validate', () =>
        HttpResponse.json(response)
      )
    )
    const validate = createValidateContacts(makeTestHttpClient().client)
    expect(
      await validate({ emails: response.data.map((r) => r.email) })
    ).toEqual(response)
  })
  it('preserves validation counts and transport metadata in a raw response', async () => {
    server.use(
      http.post('https://brew.new/api/v1/contacts/validate', () =>
        HttpResponse.json(response, {
          headers: { 'x-request-id': 'req_validation' },
        })
      )
    )
    const result = await createValidateContacts(makeTestHttpClient().client)(
      { emails: ['good@example.com'] },
      { raw: true }
    )
    expect(result.data).toEqual(response)
    expect(result.status).toBe(200)
    expect(result.requestId).toBe('req_validation')
  })
  it('narrows completed-only fields and prohibits a successful unavailable verdict (type-level)', () => {
    function details(row: ContactValidationResult): string | undefined {
      if (row.checkOutcome === 'completed') return row.didYouMean
      const isValid: false = row.valid
      // @ts-expect-error unavailable checks have no provider typo suggestion
      expect(row.didYouMean).toBeUndefined()
      expect(isValid).toBe(false)
      return undefined
    }
    expect(details(response.data[0]!)).toBe('better@example.com')
    expect(details(response.data[1]!)).toBeUndefined()
    // @ts-expect-error unavailable can never report valid: true
    const invalid: ContactValidationResult = {
      email: 'x@example.com',
      checkOutcome: 'unavailable',
      status: 'risky',
      reason: 'validation_unavailable',
      valid: true,
    }
    expect(invalid).toBeDefined()
  })
  it('returns inline upsert persistence separately from ingestion totals', async () => {
    const body = {
      summary: { inserted: 2, updated: 0, failed: 0 },
      fieldsCreated: [],
      warnings: [],
      errors: [],
      validation,
    } satisfies UpsertManyContactsResponse
    server.use(
      http.post('https://brew.new/api/v1/contacts', () =>
        HttpResponse.json(body)
      )
    )
    const result = await createUpsertManyContacts(makeTestHttpClient().client)({
      contacts: [{ email: 'good@example.com' }],
      validate: true,
    })
    expect(result.validation).toEqual(validation)
    expect(result.summary.failed).toBe(0)
  })
  it('preserves inline CSV unscored and save-failure counts', async () => {
    const body = {
      summary: { inserted: 2, updated: 0, failed: 0, skipped: 0, total: 2 },
      fieldsCreated: [],
      warnings: [],
      errors: [],
      validation,
      importId: 'imp_validation_outcomes',
    } satisfies ImportCsvContactsResponse
    server.use(
      http.post('https://brew.new/api/v1/contacts/import-csv', () =>
        HttpResponse.json(body)
      )
    )
    const result = await createImportCsvContacts(makeTestHttpClient().client)({
      csv: 'email\ngood@example.com',
      validate: true,
    })
    expect(result.validation).toEqual(validation)
    expect(result.summary.failed).toBe(0)
  })
})
