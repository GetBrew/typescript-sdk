// Compile-time checks that the adapters plug into the real option types of
// the libraries they serve, though they import none of them (structural
// types, no peer dependencies). `better-auth` and `@auth/core` (Auth.js v5's
// core, which `next-auth@5` re-exports) are devDependencies for this file
// only. next-auth v4 is not installed (it pulls in `next`); its
// `EmailConfig` is copied below from next-auth@4.24.15 `providers/email.d.ts`.
import type { AuthConfig } from '@auth/core'
import type { EmailConfig as AuthJsEmailConfig } from '@auth/core/providers/email'
import type { BetterAuthOptions } from 'better-auth'
import type { emailOTP, magicLink, organization } from 'better-auth/plugins'
import { describe, expect, it } from 'vitest'

import { brewAuthEmails } from '../../src/adapters/better-auth'
import { BrewEmail } from '../../src/adapters/next-auth'
import { createSupabaseSendEmailHook } from '../../src/adapters/supabase'
import { type BrewClient, createBrewClient } from '../../src/index'

/** next-auth@4.24.15 `EmailConfig`, minus its nodemailer transport types. */
type NextAuthV4EmailConfig = {
  id: 'email'
  type: 'email'
  name: 'Email'
  server: string | Record<string, unknown>
  from: string
  maxAge: number
  sendVerificationRequest: (params: {
    identifier: string
    url: string
    expires: Date
    provider: NextAuthV4EmailConfig
    token: string
    theme: { colorScheme?: 'auto' | 'dark' | 'light' }
  }) => Promise<void> | void
  options: {
    server?: string | Record<string, unknown>
    from?: string
    maxAge?: number
  }
}

const client: BrewClient = createBrewClient({ apiKey: 'brew_test_types' })

describe('adapter types against the libraries they serve', () => {
  it('better-auth 1.7: every callback fits its option', () => {
    const emails = brewAuthEmails({ client })

    const options = {
      emailVerification: {
        sendVerificationEmail: emails.sendVerificationEmail,
      },
      emailAndPassword: {
        enabled: true,
        sendResetPassword: emails.sendResetPassword,
      },
      user: {
        changeEmail: {
          enabled: true,
          sendChangeEmailConfirmation: emails.sendChangeEmailConfirmation,
        },
      },
      databaseHooks: { user: { create: { after: emails.onUserCreated } } },
    } satisfies BetterAuthOptions
    const magicLinkOptions = {
      sendMagicLink: emails.sendMagicLink,
    } satisfies Parameters<typeof magicLink>[0]
    const emailOtpOptions = {
      sendVerificationOTP: emails.sendVerificationOTP,
    } satisfies Parameters<typeof emailOTP>[0]
    const organizationOptions = {
      sendInvitationEmail: emails.sendInvitationEmail,
    } satisfies Parameters<typeof organization>[0]

    expect([
      options,
      magicLinkOptions,
      emailOtpOptions,
      organizationOptions,
    ]).toHaveLength(4)
  })

  it('Auth.js v5 (@auth/core) and next-auth v4: the provider fits', () => {
    const v5: AuthJsEmailConfig = BrewEmail({ client })
    const providers: AuthConfig['providers'] = [
      BrewEmail({ client: () => client }),
    ]
    const v4: NextAuthV4EmailConfig = BrewEmail({ client, id: 'email' })

    expect([v5.id, providers.length, v4.id]).toEqual(['brew', 1, 'email'])
  })

  it('Supabase: the hook is a Deno.serve handler', () => {
    const handler: (request: Request) => Response | Promise<Response> =
      createSupabaseSendEmailHook({ client, secret: 'v1,whsec_c2VjcmV0' })

    expect(typeof handler).toBe('function')
  })
})
