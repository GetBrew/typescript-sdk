import { describe, expectTypeOf, it } from 'vitest'
import type {
  EnsureIntegrationEventTriggerResponse,
  PayloadContractField,
  PayloadContractGetResponse,
  PayloadContractPutResponse,
  PayloadContractStoredField,
  UsageGetResponse,
} from '../src/index'
import type { operations } from '../src/generated/openapi-types'

describe('canonical app email response contracts', () => {
  it('exposes app email ownership on ensured live-event triggers', () => {
    expectTypeOf<EnsureIntegrationEventTriggerResponse['key']>().toEqualTypeOf<
      string | undefined
    >()
    expectTypeOf<
      EnsureIntegrationEventTriggerResponse['appEmail']
    >().toEqualTypeOf<
      | {
          automationId: string
          emailId: string
          starterId?: string
          starterVersion?: number
        }
      | undefined
    >()
  })

  it('keeps JSON contract responses and stored descriptions typed', () => {
    type JsonContract = Extract<PayloadContractGetResponse, { format: 'json' }>
    expectTypeOf<
      JsonContract['fields'][number]
    >().toEqualTypeOf<PayloadContractStoredField>()
    expectTypeOf<
      PayloadContractPutResponse['fields'][number]
    >().toEqualTypeOf<PayloadContractStoredField>()
    expectTypeOf<PayloadContractStoredField['type']>()
      .extract<'unknown'>()
      .toEqualTypeOf<'unknown'>()
    expectTypeOf<PayloadContractStoredField['description']>().toEqualTypeOf<
      string | undefined
    >()
    expectTypeOf<PayloadContractField['description']>().toEqualTypeOf<
      string | undefined
    >()
  })

  it('exposes the required on-demand billing counters', () => {
    expectTypeOf<UsageGetResponse['onDemand']>().toEqualTypeOf<{
      active: boolean
      budgetUsd: number
      capUsd: number | null
      creditsRemaining: number
      emailSendsRemaining: number
      spentUsd: number
    }>()
  })

  it('declares paid-plan refusals on both hosted connection operations', () => {
    expectTypeOf<keyof operations['getIntegrationConnection']['responses']>()
      .extract<402>()
      .toEqualTypeOf<402>()
    expectTypeOf<keyof operations['connectIntegrationHook']['responses']>()
      .extract<402>()
      .toEqualTypeOf<402>()
  })
})
