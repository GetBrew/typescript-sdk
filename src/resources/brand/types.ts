import type { components } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/brand`. */
export type BrandGetResponse = components['schemas']['BrandGetResponse']

/**
 * The brand bound to the API key, plus its extraction readiness.
 *
 * `ready` is `true` only when `status === 'completed'`. Check it before
 * `brew.emails.generate(...)`, which 422s `BRAND_NOT_READY` until
 * extraction finishes.
 */
export type Brand = BrandGetResponse['brand']

/** Lifecycle status of the bound brand's extraction. */
export type BrandStatus = Brand['status']
