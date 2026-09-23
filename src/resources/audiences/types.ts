import type { components } from '../../generated/openapi-types'

/**
 * A single saved audience row (id, name, filter set, count). The count
 * is the cached value unless you ask for the live one with
 * `brew.audiences.get(audienceId, { include: 'count' })`.
 */
export type Audience = components['schemas']['Audience']
