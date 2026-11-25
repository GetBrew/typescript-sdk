import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'

import type {
  ContentAddImageBatchResponse,
  ContentAddImageRequest,
  ContentAddImageResponse,
} from './types'

export type {
  ContentAddImageBatchResponse,
  ContentAddImageRequest,
  ContentAddImageResponse,
}

type AddImageBatchInput = Extract<
  ContentAddImageRequest,
  { readonly imageUrls: ReadonlyArray<string> }
>

type AddOneImageInput = Exclude<ContentAddImageRequest, AddImageBatchInput>

type AddImageAnswer = ContentAddImageResponse | ContentAddImageBatchResponse

export const ADD_IMAGE_DEFAULT_TIMEOUT_MS = 300_000

export function createAddImage(client: HttpClient) {
  function addImage(
    input: AddImageBatchInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentAddImageBatchResponse>>
  function addImage(
    input: AddImageBatchInput,
    options?: RequestOptions
  ): Promise<ContentAddImageBatchResponse>
  function addImage(
    input: AddOneImageInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<ContentAddImageResponse>>
  function addImage(
    input: AddOneImageInput,
    options?: RequestOptions
  ): Promise<ContentAddImageResponse>
  function addImage(
    input: ContentAddImageRequest,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AddImageAnswer>>
  function addImage(
    input: ContentAddImageRequest,
    options?: RequestOptions
  ): Promise<AddImageAnswer>
  async function addImage(
    input: ContentAddImageRequest,
    options?: RequestOptions
  ): Promise<AddImageAnswer | BrewRawResponse<AddImageAnswer>> {
    const response = await client.request<AddImageAnswer>({
      method: 'POST',
      path: '/v1/content/add-image',
      body: input,
      defaultTimeoutMs: ADD_IMAGE_DEFAULT_TIMEOUT_MS,
      ...('uploadId' in input ? { uploadId: input.uploadId } : {}),
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return addImage
}
