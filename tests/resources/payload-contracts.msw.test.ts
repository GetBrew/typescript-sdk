import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createTriggersResource } from '../../src/resources/automations/triggers/resource'
import { createSendEmail } from '../../src/resources/emails/send'
import { createPayloadContractsResource } from '../../src/resources/payload-contracts/resource'
import { createTransactionalResource } from '../../src/resources/transactional/resource'
import { makeTestHttpClient } from '../helpers/http-client'
import { server } from '../msw/server'

const STORED_CONTRACT = {
  subjectKind: 'trigger',
  subjectId: 'tri_signup',
  source: 'stored',
  typeName: 'UserSignedUpPayload',
  contractHash: 'a'.repeat(64),
  version: 2,
  enforcement: 'prune',
  enforced: false,
  fields: [
    { key: 'email', type: 'string', required: true },
    {
      key: 'order',
      type: 'object',
      required: false,
      children: [{ key: 'total', type: 'float', required: true }],
    },
  ],
}

describe('payload contract methods', () => {
  it('getContract passes format as a query param and unwraps the body', async () => {
    let url: URL | undefined
    server.use(
      http.get(
        'https://brew.new/api/v1/automations/triggers/tri_signup/contract',
        ({ request }) => {
          url = new URL(request.url)
          return HttpResponse.json({
            ...STORED_CONTRACT,
            fields: undefined,
            format: 'ts',
            content: 'export type UserSignedUpPayload = { email: string }',
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const body = await triggers.getContract({
      triggerEventId: 'tri_signup',
      format: 'ts',
    })
    expect(url?.searchParams.get('format')).toBe('ts')
    expect(body.format).toBe('ts')
    expect(body.content).toContain('UserSignedUpPayload')
  })

  it('putContract sends {fields, mode} and returns the stored contract', async () => {
    let sent: unknown
    server.use(
      http.put(
        'https://brew.new/api/v1/automations/triggers/tri_signup/contract',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json(STORED_CONTRACT)
        }
      )
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const body = await triggers.putContract({
      triggerEventId: 'tri_signup',
      fields: [{ key: 'email', type: 'string', required: true }],
    })
    // The path id never leaks into the body.
    expect(sent).toEqual({
      fields: [{ key: 'email', type: 'string', required: true }],
    })
    expect(body.version).toBe(2)
    expect(body.contractHash).toBe('a'.repeat(64))
  })

  it('validatePayload resolves (not throws) on an invalid payload', async () => {
    server.use(
      http.post(
        'https://brew.new/api/v1/automations/triggers/tri_signup/contract/validate',
        () =>
          HttpResponse.json({
            valid: false,
            errors: [
              {
                code: 'missing_required',
                field: 'email',
                message: 'Required field "email" is missing',
              },
            ],
            warnings: [],
            resolvedPayload: {},
            prunedKeys: ['coupon'],
            source: 'stored',
            contractHash: 'a'.repeat(64),
          })
      )
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const verdict = await triggers.validatePayload({
      triggerEventId: 'tri_signup',
      payload: { coupon: 'X' },
      enforcement: 'strict',
    })
    expect(verdict.valid).toBe(false)
    expect(verdict.errors[0]?.code).toBe('missing_required')
    expect(verdict.prunedKeys).toEqual(['coupon'])
  })

  it('transactional getContract hits the transactional path', async () => {
    server.use(
      http.get('https://brew.new/api/v1/transactional/txn_1/contract', () =>
        HttpResponse.json({
          ...STORED_CONTRACT,
          subjectKind: 'transactional',
          subjectId: 'txn_1',
          source: 'derived_from_template',
        })
      )
    )
    const { client } = makeTestHttpClient()
    const transactional = createTransactionalResource(client)
    const body = await transactional.getContract({ transactionId: 'txn_1' })
    expect(body.subjectKind).toBe('transactional')
    expect(body.source).toBe('derived_from_template')
  })

  it('putContract arms a contract without re-sending the tree', async () => {
    let sent: unknown
    server.use(
      http.put(
        'https://brew.new/api/v1/automations/triggers/tri_signup/contract',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json({
            ...STORED_CONTRACT,
            enforcement: 'strict',
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const triggers = createTriggersResource(client)
    const body = await triggers.putContract({
      triggerEventId: 'tri_signup',
      enforcement: 'strict',
    })
    // No `fields` — arming a contract is a one-field patch.
    expect(sent).toEqual({ enforcement: 'strict' })
    expect(body.enforcement).toBe('strict')
  })

  it('emails.send accepts the expectedContractHash pin (C-wave wire)', async () => {
    let sent: unknown
    server.use(
      http.post('https://brew.new/api/v1/sends', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ status: 'queued', sendId: 'snd_1' })
      })
    )
    const { client } = makeTestHttpClient()
    const send = createSendEmail(client)
    await send({
      transactionId: 'txn_1',
      to: 'jane@example.com',
      payload: { total: 9.5 },
      expectedContractHash: 'a'.repeat(64),
    })
    expect(sent).toMatchObject({ expectedContractHash: 'a'.repeat(64) })
  })

  it('payloadContracts.infer posts the example and returns the draft', async () => {
    let sent: unknown
    server.use(
      http.post(
        'https://brew.new/api/v1/payload-contracts/infer',
        async ({ request }) => {
          sent = await request.json()
          return HttpResponse.json({
            fields: [{ key: 'email', type: 'string', required: true }],
            issues: [],
          })
        }
      )
    )
    const { client } = makeTestHttpClient()
    const payloadContracts = createPayloadContractsResource(client)
    const draft = await payloadContracts.infer({
      example: { email: 'a@b.co' },
    })
    expect(sent).toEqual({ example: { email: 'a@b.co' } })
    expect(draft.fields[0]?.key).toBe('email')
  })
})
