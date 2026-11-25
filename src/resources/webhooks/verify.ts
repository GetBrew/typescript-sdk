import type { EmailWebhookEvent } from './types'

export type BrewWebhookVerificationReason =
  | 'headers'
  | 'timestamp'
  | 'signature'
  | 'payload'

const MESSAGES: Record<BrewWebhookVerificationReason, string> = {
  headers: 'The webhook headers or secret are missing or malformed.',
  timestamp: 'The webhook timestamp is outside the five-minute tolerance.',
  signature: 'The webhook signature does not match the body.',
  payload: 'The signed webhook body is not a JSON event.',
}

export class BrewWebhookVerificationError extends Error {
  readonly reason: BrewWebhookVerificationReason
  constructor(reason: BrewWebhookVerificationReason) {
    super(MESSAGES[reason])
    this.name = 'BrewWebhookVerificationError'
    this.reason = reason
  }
}

export type VerifyWebhookInput = {
  readonly payload: string | Uint8Array
  readonly headers: {
    readonly id: string
    readonly timestamp: string
    readonly signature: string
  }
  readonly webhookSecret: string
}

const TOLERANCE_SECONDS = 300

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function importSecret(secret: string): Promise<CryptoKey> {
  const keyText = secret.replace(/^whsec_/, '')
  if (!keyText) throw new BrewWebhookVerificationError('headers')
  try {
    return await crypto.subtle.importKey(
      'raw',
      decodeBase64(keyText),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
  } catch {
    throw new BrewWebhookVerificationError('headers')
  }
}

export async function verifyWebhook(
  input: VerifyWebhookInput
): Promise<EmailWebhookEvent> {
  const { id, timestamp, signature } = input.headers
  const seconds = Number(timestamp)
  if (
    !id ||
    !signature ||
    !/^\d+$/.test(timestamp) ||
    !Number.isSafeInteger(seconds)
  )
    throw new BrewWebhookVerificationError('headers')
  if (Math.abs(Date.now() / 1000 - seconds) > TOLERANCE_SECONDS)
    throw new BrewWebhookVerificationError('timestamp')
  const key = await importSecret(input.webhookSecret)
  const body =
    typeof input.payload === 'string'
      ? input.payload
      : new TextDecoder().decode(input.payload)
  const content = new TextEncoder().encode(`${id}.${timestamp}.${body}`)
  const checks = await Promise.all(
    signature
      .split(' ')
      .filter((candidate) => candidate.startsWith('v1,'))
      .map(async (candidate) => {
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
  if (!checks.some(Boolean)) throw new BrewWebhookVerificationError('signature')
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new BrewWebhookVerificationError('payload')
  }
  if (
    !isRecord(parsed) ||
    typeof parsed.type !== 'string' ||
    typeof parsed.created_at !== 'string' ||
    !isRecord(parsed.data)
  )
    throw new BrewWebhookVerificationError('payload')
  return parsed as EmailWebhookEvent
}
