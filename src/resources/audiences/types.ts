import type { components } from '../../generated/openapi-types'

/**
 * A single saved audience row (id, name, filter set, count). The count
 * is the cached value unless you ask for the live one with
 * `brew.audiences.get(audienceId, { include: 'count' })`.
 */
export type Audience = components['schemas']['Audience']

/**
 * What `create` and `update` return: the saved row, plus
 * `emailListMaterializations` when a long `email in [...]` list was
 * stamped into a contact-field snapshot, and (update only) the
 * `membership` report of an `addEmails` / `removeEmails` edit.
 */
export type AudienceWriteResult = components['schemas']['AudienceWriteResponse']
