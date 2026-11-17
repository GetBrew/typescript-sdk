import type { components } from '../../generated/openapi-types'

export type Automation = components['schemas']['AutomationRow']
/** A concrete source event and observation window pinned to an automation version. */
export type AutomationGoal = NonNullable<
  components['schemas']['AutomationsPostRequest']['goal']
>

/**
 * The answer to `dryRun: true` on `automations.create` / `automations.patch`:
 * the full publish-gate check, nothing written. `valid` is false while any
 * `blockers[]` (publish fails) or `blockingIssues[]` (references the bound
 * trigger or contact catalog cannot provide) remain; `warnings[]` are
 * advisory; `nodeCounts` tallies the graph.
 */
export type AutomationDryRunReport =
  components['schemas']['AutomationDryRunReport']
export type AutomationsListResponse =
  components['schemas']['AutomationsListResponse']
