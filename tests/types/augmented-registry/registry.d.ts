// What `brew-cli` (or a hand-written file) adds to an app: one entry per
// trigger key, typed with that trigger's payload.
import '@brew.new/sdk'

declare module '@brew.new/sdk' {
  interface BrewTriggerKeyRegistry {
    'auth.password-reset': {
      email: string
      confirmationUrl: string
      appName?: string
    }
    'order.paid': { email: string; orderId: string; total: number }
    // A payload that is itself a union: one alternative per channel.
    'invite.sent':
      | { email: string; channel: 'link'; confirmationUrl: string }
      | { email: string; channel: 'code'; otp: string }
  }
}
