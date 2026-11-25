export type BuildHeadersInput = {
  readonly apiKey: string
  readonly brandId?: string
  readonly userAgent: string
  readonly idempotencyKey?: string
  readonly hasBody?: boolean
  readonly extras?: Readonly<Record<string, string>>
}

export function buildHeaders(input: BuildHeadersInput): Headers {
  const headers = new Headers()

  headers.set('authorization', `Bearer ${input.apiKey}`)
  headers.set('user-agent', input.userAgent)
  headers.set('accept', 'application/json')

  if (input.hasBody === true) {
    headers.set('content-type', 'application/json')
  }

  if (input.idempotencyKey !== undefined) {
    headers.set('idempotency-key', input.idempotencyKey)
  }

  if (input.brandId !== undefined) {
    headers.set('x-brand-id', input.brandId)
  }

  if (input.extras) {
    for (const [key, value] of Object.entries(input.extras)) {
      headers.set(key, value)
    }
  }

  return headers
}

export type BuildUploadHeadersInput = {
  readonly userAgent: string
  readonly contentType: string
}

export function buildUploadHeaders(input: BuildUploadHeadersInput): Headers {
  const headers = new Headers()
  headers.set('user-agent', input.userAgent)
  headers.set('accept', 'application/json')
  headers.set('content-type', input.contentType)
  return headers
}
