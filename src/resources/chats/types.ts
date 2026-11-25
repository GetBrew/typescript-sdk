import type { operations } from '../../generated/openapi-types'

export type ChatContextResponse =
  operations['getChatContext']['responses'][200]['content']['application/json']

export type ChatArtifact = ChatContextResponse['artifacts'][number]

export type ChatMessage = ChatContextResponse['recentMessages'][number]

export type ChatsListResponse =
  operations['listChats']['responses'][200]['content']['application/json']

export type ChatSummary = ChatsListResponse['data'][number]

export type ChatStatus = ChatSummary['status']

export type ListChatsInput = Readonly<
  NonNullable<operations['listChats']['parameters']['query']>
>
