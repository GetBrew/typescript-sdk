import type { HttpClient } from '../../core/http'

import { createRunDataCommand } from './run'

export type DataResource = {
  /** `POST /v1/data` — run one `db …` command over the brand's data. */
  readonly run: ReturnType<typeof createRunDataCommand>
}

export function createDataResource(client: HttpClient): DataResource {
  return {
    run: createRunDataCommand(client),
  }
}
