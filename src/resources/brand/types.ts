import type { components, paths } from '../../generated/openapi-types'

/**
 * Envelope returned by `GET /v1/brand` and `PATCH /v1/brand`.
 *
 * `brand` is always present. The optional `identity` / `emailDesign` /
 * `imageStyle` / `logos` fields are populated on a `GET` only for the
 * sub-resources named in `?include=`, and on a `PATCH` only for the
 * fields that were touched.
 */
export type BrandGetResponse = components['schemas']['BrandGetResponse']

/** Echoed by `PATCH /v1/brand` — same envelope, only the touched fields. */
export type BrandPatchResponse = BrandGetResponse

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

/** Structured brand identity (embedded via `?include=identity`). */
export type BrandIdentity = NonNullable<BrandGetResponse['identity']>

/** A single CDN-hosted logo variant (embedded via `?include=logos`). */
export type BrandLogo = NonNullable<BrandGetResponse['logos']>[number]

/** Body for `PATCH /v1/brand`. At least one of the keys must be present. */
export type UpdateBrandInput = components['schemas']['BrandPatchRequest']

/** A sub-resource token accepted by `GET /v1/brand`'s `?include=`. */
export type BrandIncludeToken =
  | 'identity'
  | 'emailDesign'
  | 'imageStyle'
  | 'logos'

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
