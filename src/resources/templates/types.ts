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

/**
 * Envelope returned by `GET /v1/templates?representation=summary`: rows
 * without `html`, each carrying `referenceEmailId` (pass it as
 * `referenceEmailId` to `emails.generate`) and the gallery `viewUrl`.
 */
export type TemplateSummaryListResponse = Exclude<
  operations['listTemplates']['responses'][200]['content']['application/json'],
  TemplatesListResponse
>

/** One summary row (`representation: 'summary'`). */
export type TemplateSummary = TemplateSummaryListResponse['data'][number]
