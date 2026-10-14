import type { CanvasTarget } from '@brew.new/sdk/embed'

export type DemoTarget = Readonly<{ label: string; target: CanvasTarget }>
export type DemoConfig = Readonly<{
  appOrigin: string
  embedOrigin: string
  apiKey: string
  brandId: string
  sessionSecret: string
  allowedUserIds: ReadonlyArray<string>
  targets: ReadonlyArray<DemoTarget>
  canEdit: boolean
}>

const required = [
  'APP_ORIGIN',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'DEMO_ALLOWED_USER_IDS',
  'CANVAS_SESSION_SECRET',
  'BREW_API_KEY',
  'BREW_BRAND_ID',
] as const

type Environment = Readonly<Record<string, string | undefined>>
export function missingConfiguration(env: Environment): Array<string> {
  const missing: Array<string> = required.filter((key) => !env[key]?.trim())
  if (!env.BREW_GROUP_ID?.trim() && !env.BREW_EMAIL_ID?.trim()) {
    missing.push('BREW_GROUP_ID or BREW_EMAIL_ID')
  }
  return missing
}

function origin(value: string): string {
  const url = new URL(value)
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (
    url.origin !== value ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback))
  ) {
    throw new Error(
      'Use an exact HTTPS origin, or HTTP loopback for local development.'
    )
  }
  return value
}

export function readConfig(env: Environment): DemoConfig {
  if (missingConfiguration(env).length) {
    throw new Error('Complete .env.local using .env.example.')
  }
  const sessionSecret = env.CANVAS_SESSION_SECRET ?? ''
  if (sessionSecret.length < 64) {
    throw new Error('CANVAS_SESSION_SECRET needs at least 64 characters.')
  }
  if (env.CANVAS_CAN_EDIT && !['true', 'false'].includes(env.CANVAS_CAN_EDIT)) {
    throw new Error('CANVAS_CAN_EDIT must be true or false.')
  }
  const allowedUserIds = (env.DEMO_ALLOWED_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  if (!allowedUserIds.length) {
    throw new Error('Configure at least one allowed Clerk user ID.')
  }
  const targets: Array<DemoTarget> = []
  if (env.BREW_GROUP_ID?.trim()) {
    targets.push({
      label: 'Campaign group',
      target: { type: 'group', groupId: env.BREW_GROUP_ID.trim() },
    })
  }
  if (env.BREW_EMAIL_ID?.trim()) {
    targets.push({
      label: 'Single email',
      target: { type: 'email', emailId: env.BREW_EMAIL_ID.trim() },
    })
  }
  return {
    appOrigin: origin(env.APP_ORIGIN ?? ''),
    embedOrigin: origin(env.BREW_EMBED_ORIGIN || 'https://brew.new'),
    apiKey: env.BREW_API_KEY ?? '',
    brandId: env.BREW_BRAND_ID ?? '',
    sessionSecret,
    allowedUserIds,
    targets,
    canEdit: env.CANVAS_CAN_EDIT !== 'false',
  }
}
