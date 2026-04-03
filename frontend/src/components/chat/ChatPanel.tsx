/**
 * ChatPanel — floating AI assistant panel.
 *
 * Renders as a toggle button fixed to the bottom-right corner.
 * When open, shows the full conversation thread and input bar.
 * Sends the full history to /api/core/chat/ on each message.
 * Claude can call tools which execute actions inside the app.
 */

import { useEffect, useRef, useState } from 'react'
import { sendChatMessage } from '../../lib/api'
import type { ChatMessage as ChatMessageType } from '../../lib/types'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'

const WELCOME: ChatMessageType = {
  role: 'assistant',
  content: "Hey Mohamed. Tell me what to log, what to create, or ask me anything about your system.",
  actions: [],
}

export function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever messages update or panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages, open])

  async function handleSend(text: string) {
    // Add user message immediately
    const userMsg: ChatMessageType = { role: 'user', content: text, actions: [] }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setLoading(true)

    try {
      // Build history in Anthropic format (skip welcome message — it's synthetic)
      const history = nextMessages
        .slice(1) // skip welcome
        .map(m => ({ role: m.role, content: m.content }))

      const result = await sendChatMessage(history)

      const assistantMsg: ChatMessageType = {
        role: 'assistant',
        content: result.reply,
        actions: result.actions ?? [],
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      const errorMsg: ChatMessageType = {
        role: 'assistant',
        content: "Something went wrong reaching the AI. Check that the backend is running.",
        actions: [],
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        className={`chat-toggle ${open ? 'chat-toggle--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        title={open ? 'Close AI' : 'Talk to AI'}
      >
        {open ? '✕' : 'AI'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel">
          <div className="chat-panel__header">
            <span className="chat-panel__title">AI Assistant</span>
            <span className="chat-panel__hint">Can log, create, and answer.</span>
          </div>

          <div className="chat-panel__thread">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && (
              <div className="chat-message chat-message--assistant">
                <div className="chat-message__label">AI</div>
                <div className="chat-message__bubble chat-message__bubble--thinking">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      )}
    </>
  )
}
