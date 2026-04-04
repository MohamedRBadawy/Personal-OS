/**
 * ChatInput — text input bar at the bottom of the chat panel.
 * Submits on Enter (Shift+Enter for newline) or click.
 */

import { useRef, useState } from 'react'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    setTimeout(() => ref.current?.focus(), 0)
  }

  return (
    <div className="chat-input">
      <textarea
        ref={ref}
        className="chat-input__field"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Log sleep, mark habits, ask anything…"}
        rows={2}
        disabled={disabled}
      />
      <button
        className="chat-input__send"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        {disabled ? '…' : '↑'}
      </button>
    </div>
  )
}
