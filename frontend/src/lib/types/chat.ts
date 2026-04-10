/** A single executed tool action returned by the chat endpoint. */
export type ChatAction = {
  tool: string
  result: Record<string, unknown>
}

/** A single message in the chat thread (user or assistant). */
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  actions?: ChatAction[]
}

/** Response from POST /api/core/chat/ */
export type ChatResponse = {
  reply: string
  actions: ChatAction[]
  affected_modules: string[]
  proposed_actions?: ChatProposedAction[]
  requires_confirmation?: boolean
}

export type ChatProposedAction = {
  tool: string
  module: string | null
  summary: string
  input: Record<string, unknown>
}
