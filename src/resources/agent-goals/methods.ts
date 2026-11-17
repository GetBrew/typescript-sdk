import { unwrapResponse, type HttpClient } from '../../core/http'
import type { BrewRawResponse, RequestOptions } from '../../types'
import type {
  AgentGoal,
  AgentGoalDetail,
  AgentGoalDocuments,
  AgentGoalDocumentsInput,
  AgentGoalFollowUp,
  AgentGoalFollowUpInput,
  AgentGoalListInput,
  AgentGoalPublication,
  AgentGoalTasks,
  AgentGoalTasksInput,
  AgentGoalsList,
  CreateAgentGoalInput,
  PublishAgentGoalDocumentInput,
  UpdateAgentGoalInput,
} from './types'

export function createListAgentGoal(client: HttpClient) {
  function request(
    input: AgentGoalListInput | undefined,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AgentGoalsList>>
  function request(
    input?: AgentGoalListInput,
    options?: RequestOptions
  ): Promise<AgentGoalsList>
  async function request(
    input: AgentGoalListInput = {},
    options?: RequestOptions
  ): Promise<AgentGoalsList | BrewRawResponse<AgentGoalsList>> {
    const response = await client.request<AgentGoalsList>({
      method: 'GET',
      path: '/v1/agent-goals',
      query: { limit: input.limit, cursor: input.cursor },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return request
}

export function createGetAgentGoal(client: HttpClient) {
  function request(
    input: string,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AgentGoalDetail>>
  function request(
    input: string,
    options?: RequestOptions
  ): Promise<AgentGoalDetail>
  async function request(
    input: string,
    options?: RequestOptions
  ): Promise<AgentGoalDetail | BrewRawResponse<AgentGoalDetail>> {
    const response = await client.request<AgentGoalDetail>({
      method: 'GET',
      path: `/v1/agent-goals/${encodeURIComponent(input)}`,

      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return request
}

export function createCreateAgentGoal(client: HttpClient) {
  function request(
    input: CreateAgentGoalInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AgentGoal>>
  function request(
    input: CreateAgentGoalInput,
    options?: RequestOptions
  ): Promise<AgentGoal>
  async function request(
    input: CreateAgentGoalInput,
    options?: RequestOptions
  ): Promise<AgentGoal | BrewRawResponse<AgentGoal>> {
    const response = await client.request<AgentGoal>({
      method: 'POST',
      path: '/v1/agent-goals',
      body: input,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return request
}

export function createUpdateAgentGoal(client: HttpClient) {
  function request(
    input: UpdateAgentGoalInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AgentGoal>>
  function request(
    input: UpdateAgentGoalInput,
    options?: RequestOptions
  ): Promise<AgentGoal>
  async function request(
    input: UpdateAgentGoalInput,
    options?: RequestOptions
  ): Promise<AgentGoal | BrewRawResponse<AgentGoal>> {
    const { goalId, ...body } = input
    const response = await client.request<AgentGoal>({
      method: 'PATCH',
      path: `/v1/agent-goals/${encodeURIComponent(goalId)}`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return request
}

export function createTasksAgentGoal(client: HttpClient) {
  function request(
    input: AgentGoalTasksInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AgentGoalTasks>>
  function request(
    input: AgentGoalTasksInput,
    options?: RequestOptions
  ): Promise<AgentGoalTasks>
  async function request(
    input: AgentGoalTasksInput,
    options?: RequestOptions
  ): Promise<AgentGoalTasks | BrewRawResponse<AgentGoalTasks>> {
    const response = await client.request<AgentGoalTasks>({
      method: 'GET',
      path: `/v1/agent-goals/${encodeURIComponent(input.goalId)}/tasks`,
      query: { limit: input.limit, cursor: input.cursor },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return request
}

export function createDocumentsAgentGoal(client: HttpClient) {
  function request(
    input: AgentGoalDocumentsInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AgentGoalDocuments>>
  function request(
    input: AgentGoalDocumentsInput,
    options?: RequestOptions
  ): Promise<AgentGoalDocuments>
  async function request(
    input: AgentGoalDocumentsInput,
    options?: RequestOptions
  ): Promise<AgentGoalDocuments | BrewRawResponse<AgentGoalDocuments>> {
    const response = await client.request<AgentGoalDocuments>({
      method: 'GET',
      path: `/v1/agent-goals/${encodeURIComponent(input.goalId)}/documents`,
      query: { limit: input.limit, cursor: input.cursor },
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return request
}

export function createFollowUpAgentGoal(client: HttpClient) {
  function request(
    input: AgentGoalFollowUpInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AgentGoalFollowUp>>
  function request(
    input: AgentGoalFollowUpInput,
    options?: RequestOptions
  ): Promise<AgentGoalFollowUp>
  async function request(
    input: AgentGoalFollowUpInput,
    options?: RequestOptions
  ): Promise<AgentGoalFollowUp | BrewRawResponse<AgentGoalFollowUp>> {
    const { goalId, ...body } = input
    const response = await client.request<AgentGoalFollowUp>({
      method: 'POST',
      path: `/v1/agent-goals/${encodeURIComponent(goalId)}/follow-ups`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return request
}

export function createPublishDocumentAgentGoal(client: HttpClient) {
  function request(
    input: PublishAgentGoalDocumentInput,
    options: RequestOptions & { readonly raw: true }
  ): Promise<BrewRawResponse<AgentGoalPublication>>
  function request(
    input: PublishAgentGoalDocumentInput,
    options?: RequestOptions
  ): Promise<AgentGoalPublication>
  async function request(
    input: PublishAgentGoalDocumentInput,
    options?: RequestOptions
  ): Promise<AgentGoalPublication | BrewRawResponse<AgentGoalPublication>> {
    const { goalId, ...body } = input
    const response = await client.request<AgentGoalPublication>({
      method: 'POST',
      path: `/v1/agent-goals/${encodeURIComponent(goalId)}/documents`,
      body,
      ...(options ? { options } : {}),
    })
    return unwrapResponse(response, options)
  }
  return request
}
