/**
 * ChatMessage — renders a single message bubble in the chat thread.
 * Shows role (user vs assistant), message text, and any action badges.
 */

import type { ChatAction, ChatMessage as ChatMessageType } from '../../lib/types'

interface Props {
  message: ChatMessageType
}

/** Maps tool names to human-readable action labels. */
function actionLabel(tool: string): string {
  const labels: Record<string, string> = {
    log_health_today: '✓ Health log saved',
    log_mood_today: '✓ Mood logged',
    log_spiritual_today: '✓ Spiritual log saved',
    mark_habit_done: '✓ Habit marked done',
    create_node: '✓ Node created',
    update_node_status: '✓ Status updated',
    add_finance_entry: '✓ Finance entry saved',
    add_opportunity: '✓ Opportunity added',
    capture_idea: '✓ Idea captured',
    log_achievement: '✓ Achievement recorded',
    log_decision: '✓ Decision logged',
  }
  return labels[tool] ?? `✓ ${tool.replace(/_/g, ' ')}`
}

function ActionBadge({ action }: { action: ChatAction }) {
  const hasError = 'error' in (action.result ?? {})
  return (
    <span className={`chat-action-badge ${hasError ? 'chat-action-badge--error' : ''}`}>
      {hasError ? `✗ ${action.result?.error}` : actionLabel(action.tool)}
    </span>
  )
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'
  return (
    <div className={`chat-message chat-message--${message.role}`}>
      {!isUser && (
        <div className="chat-message__label">AI</div>
      )}
      <div className="chat-message__bubble">
        <p className="chat-message__text">{message.content}</p>
        {message.actions && message.actions.length > 0 && (
          <div className="chat-message__actions">
            {message.actions.map((action, i) => (
              <ActionBadge key={i} action={action} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
