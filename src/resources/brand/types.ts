import type { components, paths } from '../../generated/openapi-types'

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

/** `{ markdown }` returned by `GET`/`PUT /v1/brand/email-design`. */
export type BrandEmailDesignResponse =
  components['schemas']['BrandEmailDesignResponse']

/** Body for `PUT /v1/brand/email-design` — replaces the whole document. */
export type UpdateBrandEmailDesignInput =
  components['schemas']['BrandEmailDesignPutRequest']

/** `{ markdown }` returned by `GET`/`PUT /v1/brand/image-style`. */
export type BrandImageStyleResponse =
  components['schemas']['BrandImageStyleResponse']

/** Body for `PUT /v1/brand/image-style` — replaces the whole document. */
export type UpdateBrandImageStyleInput =
  components['schemas']['BrandImageStylePutRequest']

/** Structured brand identity returned by `GET`/`PATCH /v1/brand/identity`. */
export type BrandIdentity = components['schemas']['BrandIdentity']

/** Body for `PATCH /v1/brand/identity` — shallow-merges the given fields. */
export type UpdateBrandIdentityInput =
  components['schemas']['BrandIdentityPatchRequest']

/** `{ data }` returned by `GET /v1/brand/logos` (a small fixed set). */
export type BrandLogosResponse = components['schemas']['BrandLogosResponse']

/** `{ data, pagination }` returned by `GET /v1/brand/images`. */
export type BrandImagesResponse = components['schemas']['BrandImagesResponse']

/**
 * Query parameters for `brew.brand.getImages`. Sourced from the generated
 * query type so a new pagination knob upstream surfaces as a compile error
 * in the SDK.
 */
export type ListBrandImagesInput = Readonly<
  NonNullable<paths['/v1/brand/images']['get']['parameters']['query']>
>
