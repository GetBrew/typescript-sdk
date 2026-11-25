import type { components, paths } from '../../generated/openapi-types'

export type BrandGetResponse = components['schemas']['BrandGetResponse']

export type BrandPatchResponse = BrandGetResponse

export type Brand = Omit<
  BrandGetResponse,
  'identity' | 'emailDesign' | 'imageStyle' | 'logos'
>

export type BrandStatus = Brand['status']

export type BrandIdentity = NonNullable<BrandGetResponse['identity']>

export type BrandLogo = NonNullable<BrandGetResponse['logos']>[number]

export type UpdateBrandInput = components['schemas']['BrandPatchRequest']

export const BRAND_INCLUDE_TOKENS = [
  'identity',
  'emailDesign',
  'imageStyle',
  'logos',
] as const
export type BrandIncludeToken = (typeof BRAND_INCLUDE_TOKENS)[number]

export type BrandImagesResponse = components['schemas']['BrandImagesResponse']

export type ListBrandImagesInput = Readonly<
  NonNullable<paths['/v1/brand/images']['get']['parameters']['query']>
>

export type BrandImageDeleteResponse =
  components['schemas']['BrandImageDeleteResponse']
