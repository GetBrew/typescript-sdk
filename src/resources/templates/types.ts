import type { components, operations } from '../../generated/openapi-types'

/** Envelope returned by `GET /v1/templates` with full rows (the default). */
export type TemplatesListResponse =
  components['schemas']['TemplatesListResponse']

/**
 * One full template row from the list envelope: the rendered `html` and
 * `previewImage`, plus `title`/`category`/`brand`/`updatedAt`.
 * `templates.get(templateId)` reads a single template.
 */
export type Template = TemplatesListResponse['data'][number]

/** Every body `GET /v1/templates` answers `200` with. */
type TemplatesListBody =
  operations['listTemplates']['responses'][200]['content']['application/json']

/**
 * The API's count mode (`count: true`, optionally `groupBy`;
 * brew-v2#1821): `{ count, groups? }` instead of rows. The SDK does not
 * type that mode yet, so `ListTemplatesInput` leaves out `count` and
 * `groupBy`.
 */
type TemplatesCountBody = Extract<TemplatesListBody, { count: number }>

/**
 * Envelope returned by `GET /v1/templates?representation=summary`: rows
 * without `html`, each carrying `referenceEmailId` (pass it as
 * `referenceEmailId` to `emails.generate`) and the gallery `viewUrl`.
 */
export type TemplateSummaryListResponse = Exclude<
  TemplatesListBody,
  TemplatesListResponse | TemplatesCountBody
>

/** One summary row (`representation: 'summary'`). */
export type TemplateSummary = TemplateSummaryListResponse['data'][number]
