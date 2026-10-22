import { describe, expect, it } from 'vitest'
import {
  checkConfiguration,
  missingConfiguration,
  readConfig,
} from '../lib/config'

const clientId = 'brew_client_0123456789abcdef0123456789abcdef'
describe('client ID demo setup', () => {
  it('retains an explicit brand for organization-wide clients and ungrouped', () => {
    expect(
      readConfig({
        NEXT_PUBLIC_BREW_CLIENT_ID: clientId,
        BREW_BRAND_ID: 'brand_a',
        BREW_GROUP_ID: 'ungrouped',
      })
    ).toHaveProperty('brandId', 'brand_a')
  })
  it('rejects oversized brand IDs without echoing configuration', () => {
    expect(() =>
      readConfig({
        NEXT_PUBLIC_BREW_CLIENT_ID: clientId,
        BREW_BRAND_ID: 'x'.repeat(201),
        BREW_GROUP_ID: 'ungrouped',
      })
    ).toThrow('Brand IDs must be at most 200 characters.')
  })
  it('needs only a publishable client ID and one target', () => {
    expect(
      readConfig({
        NEXT_PUBLIC_BREW_CLIENT_ID: clientId,
        BREW_GROUP_ID: 'grp_a',
      })
    ).toEqual({
      clientId,
      embedOrigin: 'https://brew.new',
      targets: [
        {
          label: 'Campaign group',
          target: { type: 'group', groupId: 'grp_a' },
        },
      ],
    })
  })
  it('supports a single-email-only demo', () => {
    expect(
      readConfig({
        NEXT_PUBLIC_BREW_CLIENT_ID: clientId,
        BREW_EMAIL_ID: 'email_a',
      }).targets
    ).toEqual([
      { label: 'Single email', target: { type: 'email', emailId: 'email_a' } },
    ])
  })
  it('explains missing setup without requesting secret credentials', () => {
    expect(missingConfiguration({})).toEqual([
      'NEXT_PUBLIC_BREW_CLIENT_ID',
      'BREW_GROUP_ID or BREW_EMAIL_ID',
    ])
  })
  it('rejects API keys and untrusted embed URLs', () => {
    expect(() =>
      readConfig({
        NEXT_PUBLIC_BREW_CLIENT_ID: 'brew_api_key',
        BREW_GROUP_ID: 'a',
      })
    ).toThrow('client ID')
    expect(() =>
      readConfig({
        NEXT_PUBLIC_BREW_CLIENT_ID: clientId,
        BREW_GROUP_ID: 'a',
        BREW_EMBED_ORIGIN: 'http://remote.example',
      })
    ).toThrow('HTTPS')
  })
  it('returns actionable setup problems without exposing an invalid credential', () => {
    expect(checkConfiguration({})).toEqual({
      config: null,
      problems: [
        'Set NEXT_PUBLIC_BREW_CLIENT_ID.',
        'Set BREW_GROUP_ID or BREW_EMAIL_ID.',
      ],
    })
    expect(
      checkConfiguration({
        NEXT_PUBLIC_BREW_CLIENT_ID: 'accidentally-pasted-secret',
        BREW_GROUP_ID: 'ungrouped',
      })
    ).toEqual({
      config: null,
      problems: ['Copy the client ID from Brew Settings → API → Client apps.'],
    })
  })
  it('reports malformed embed origins as setup problems instead of throwing', () => {
    expect(
      checkConfiguration({
        NEXT_PUBLIC_BREW_CLIENT_ID: clientId,
        BREW_GROUP_ID: 'ungrouped',
        BREW_EMBED_ORIGIN: 'not a URL',
      })
    ).toEqual({
      config: null,
      problems: [expect.stringContaining('HTTPS origin')],
    })
  })
  it('returns the validated configuration for the app and doctor', () => {
    const env = {
      NEXT_PUBLIC_BREW_CLIENT_ID: clientId,
      BREW_EMAIL_ID: 'email_a',
    }
    expect(checkConfiguration(env)).toEqual({
      config: readConfig(env),
      problems: [],
    })
  })
})
