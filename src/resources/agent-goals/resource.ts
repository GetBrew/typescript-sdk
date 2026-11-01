import type { HttpClient } from '../../core/http'
import {
  createListAgentGoal,
  createGetAgentGoal,
  createCreateAgentGoal,
  createUpdateAgentGoal,
  createTasksAgentGoal,
  createDocumentsAgentGoal,
  createFollowUpAgentGoal,
  createPublishDocumentAgentGoal,
} from './methods'

export type AgentGoalsResource = {
  readonly list: ReturnType<typeof createListAgentGoal>
  readonly get: ReturnType<typeof createGetAgentGoal>
  readonly create: ReturnType<typeof createCreateAgentGoal>
  readonly update: ReturnType<typeof createUpdateAgentGoal>
  readonly tasks: ReturnType<typeof createTasksAgentGoal>
  readonly documents: ReturnType<typeof createDocumentsAgentGoal>
  readonly followUp: ReturnType<typeof createFollowUpAgentGoal>
  readonly publishDocument: ReturnType<typeof createPublishDocumentAgentGoal>
}

export function createAgentGoalsResource(
  client: HttpClient
): AgentGoalsResource {
  return {
    list: createListAgentGoal(client),
    get: createGetAgentGoal(client),
    create: createCreateAgentGoal(client),
    update: createUpdateAgentGoal(client),
    tasks: createTasksAgentGoal(client),
    documents: createDocumentsAgentGoal(client),
    followUp: createFollowUpAgentGoal(client),
    publishDocument: createPublishDocumentAgentGoal(client),
  }
}
