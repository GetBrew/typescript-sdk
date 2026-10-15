import { describe, expect, it } from 'vitest'
import { missingConfiguration, readConfig } from '../lib/config'

const clientId = 'brew_client_0123456789abcdef0123456789abcdef'
describe('client ID demo setup', () => {
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
})
