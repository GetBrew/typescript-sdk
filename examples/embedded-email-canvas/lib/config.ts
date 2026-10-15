import {
  CANVAS_CLIENT_ID_PATTERN,
  type CanvasTarget,
} from '@brew.new/sdk/embed'

export type DemoTarget = Readonly<{ label: string; target: CanvasTarget }>
export type DemoConfig = Readonly<{
  clientId: string
  embedOrigin: string
  targets: ReadonlyArray<DemoTarget>
}>
type Environment = Readonly<Record<string, string | undefined>>
export function missingConfiguration(env: Environment): Array<string> {
  const missing: Array<string> = []
  if (!env.NEXT_PUBLIC_BREW_CLIENT_ID?.trim())
    missing.push('NEXT_PUBLIC_BREW_CLIENT_ID')
  if (!env.BREW_GROUP_ID?.trim() && !env.BREW_EMAIL_ID?.trim())
    missing.push('BREW_GROUP_ID or BREW_EMAIL_ID')
  return missing
}
export function readConfig(env: Environment): DemoConfig {
  if (missingConfiguration(env).length)
    throw new Error('Complete .env.local using .env.example.')
  const clientId = env.NEXT_PUBLIC_BREW_CLIENT_ID?.trim() ?? ''
  if (!CANVAS_CLIENT_ID_PATTERN.test(clientId))
    throw new Error(
      'Copy the client ID from Brew Settings → API → Client apps.'
    )
  const embedOrigin = env.BREW_EMBED_ORIGIN || 'https://brew.new'
  const url = new URL(embedOrigin)
  if (
    url.origin !== embedOrigin ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      ))
  )
    throw new Error(
      'Use an exact HTTPS origin, or HTTP loopback for local development.'
    )
  const targets: Array<DemoTarget> = []
  for (const [type, value, label] of [
    ['group', env.BREW_GROUP_ID, 'Campaign group'],
    ['email', env.BREW_EMAIL_ID, 'Single email'],
  ] as const) {
    if (!value?.trim()) continue
    if (value.trim().length > 200)
      throw new Error('Group and email IDs must be at most 200 characters.')
    targets.push({
      label,
      target:
        type === 'group'
          ? { type, groupId: value.trim() }
          : { type, emailId: value.trim() },
    })
  }
  return { clientId, embedOrigin, targets }
}
