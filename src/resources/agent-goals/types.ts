import type { operations } from '../../generated/openapi-types'

export type AgentGoalsList =
  operations['listAgentGoals']['responses'][200]['content']['application/json']
export type AgentGoal =
  operations['createAgentGoal']['responses'][201]['content']['application/json']
export type AgentGoalDetail =
  operations['getAgentGoal']['responses'][200]['content']['application/json']
export type AgentGoalTasks =
  operations['listAgentGoalTasks']['responses'][200]['content']['application/json']
export type AgentGoalDocuments =
  operations['listAgentGoalDocuments']['responses'][200]['content']['application/json']
export type AgentGoalFollowUp =
  operations['scheduleAgentGoalFollowUp']['responses'][201]['content']['application/json']
export type AgentGoalPublication =
  operations['publishAgentGoalDocument']['responses'][200]['content']['application/json']

export type AgentGoalListInput = Readonly<
  NonNullable<operations['listAgentGoals']['parameters']['query']>
>
export type CreateAgentGoalInput = Readonly<
  operations['createAgentGoal']['requestBody']['content']['application/json']
>
export type UpdateAgentGoalInput = Readonly<
  operations['updateAgentGoal']['requestBody']['content']['application/json'] & {
    goalId: string
  }
>
export type AgentGoalTasksInput = Readonly<
  NonNullable<operations['listAgentGoalTasks']['parameters']['query']> & {
    goalId: string
  }
>
export type AgentGoalDocumentsInput = Readonly<
  NonNullable<operations['listAgentGoalDocuments']['parameters']['query']> & {
    goalId: string
  }
>
export type AgentGoalFollowUpInput = Readonly<
  operations['scheduleAgentGoalFollowUp']['requestBody']['content']['application/json'] & {
    goalId: string
  }
>
export type PublishAgentGoalDocumentInput = Readonly<
  operations['publishAgentGoalDocument']['requestBody']['content']['application/json'] & {
    goalId: string
  }
>
