import type { EmailWebhookEvent } from './types'

export class BrewWebhookVerificationError extends Error {
  constructor() {
    super('The webhook signature, timestamp, or payload is invalid.')
    this.name = 'BrewWebhookVerificationError'
  }
}
export type VerifyWebhookInput = {
  readonly payload: string
  readonly headers: {
    readonly id: string
    readonly timestamp: string
    readonly signature: string
  }
  readonly webhookSecret: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function optionalStrings(
  value: Record<string, unknown>,
  keys: ReadonlyArray<string>
): boolean {
  return keys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string'
  )
}
function isEmailWebhookEvent(value: unknown): value is EmailWebhookEvent {
  if (
    !isRecord(value) ||
    typeof value.type !== 'string' ||
    typeof value.created_at !== 'string' ||
    !isRecord(value.data)
  )
    return false
  const types: Record<EmailWebhookEvent['type'], true> = {
    'email.sent': true,
    'email.delivered': true,
    'email.delivery_delayed': true,
    'email.bounced': true,
    'email.complained': true,
    'email.failed': true,
    'email.opened': true,
    'email.clicked': true,
  }
  if (!Object.hasOwn(types, value.type)) return false
  const data = value.data
  if (
    typeof data.email_id !== 'string' ||
    typeof data.created_at !== 'string' ||
    !Array.isArray(data.to) ||
    !data.to.every((recipient: unknown) => typeof recipient === 'string')
  )
    return false
  if (!optionalStrings(data, ['from', 'subject']) || !isRecord(data.brew))
    return false
  const brew = data.brew
  if (
    typeof brew.event_id !== 'string' ||
    brew.schema_version !== 1 ||
    !optionalStrings(brew, [
      'recipient',
      'send_id',
      'design_id',
      'automation_id',
      'provider_message_id',
    ]) ||
    (brew.test !== undefined && brew.test !== true)
  )
    return false
  if (
    data.tags !== undefined &&
    (!isRecord(data.tags) ||
      !Object.values(data.tags).every((tag) => typeof tag === 'string'))
  )
    return false
  if (
    data.bounce !== undefined &&
    (!isRecord(data.bounce) ||
      typeof data.bounce.type !== 'string' ||
      !optionalStrings(data.bounce, ['subType', 'message']))
  )
    return false
  if (
    data.failed !== undefined &&
    (!isRecord(data.failed) || typeof data.failed.reason !== 'string')
  )
    return false
  if (
    data.click !== undefined &&
    (!isRecord(data.click) ||
      typeof data.click.link !== 'string' ||
      !optionalStrings(data.click, ['timestamp', 'ipAddress', 'userAgent']))
  )
    return false
  if (
    data.open !== undefined &&
    (!isRecord(data.open) ||
      !optionalStrings(data.open, ['timestamp', 'ipAddress', 'userAgent']))
  )
    return false
  return true
}
function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

/** Verify the unmodified body using the same HMAC protocol and five-minute tolerance as Svix. */
export async function verifyWebhook(
  input: VerifyWebhookInput
): Promise<EmailWebhookEvent> {
  try {
    const { id, timestamp, signature } = input.headers
    const seconds = Number(timestamp)
    if (
      !id ||
      !/^\d+$/.test(timestamp) ||
      !Number.isSafeInteger(seconds) ||
      Math.abs(Date.now() / 1000 - seconds) > 300
    )
      throw new BrewWebhookVerificationError()
    const keyText = input.webhookSecret.replace(/^whsec_/, '')
    if (!keyText) throw new BrewWebhookVerificationError()
    const key = await crypto.subtle.importKey(
      'raw',
      decodeBase64(keyText),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const content = new TextEncoder().encode(
      `${id}.${timestamp}.${input.payload}`
    )
    const candidates = signature
      .split(' ')
      .filter((candidate) => candidate.startsWith('v1,'))
    const checks = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          return await crypto.subtle.verify(
            'HMAC',
            key,
            decodeBase64(candidate.slice(3)),
            content
          )
        } catch {
          return false
        }
      })
    )
    if (!checks.some(Boolean)) throw new BrewWebhookVerificationError()
    const parsed: unknown = JSON.parse(input.payload)
    if (!isEmailWebhookEvent(parsed)) throw new BrewWebhookVerificationError()
    return parsed
  } catch {
    throw new BrewWebhookVerificationError()
  }
}
