import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createIdea } from '../lib/api'

interface Props {
  onClose: () => void
}

export function QuickCaptureModal({ onClose }: Props) {
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [saved, setSaved] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  useEffect(() => {
    titleRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const mut = useMutation({
    mutationFn: () => createIdea({ title: title.trim(), context, status: 'raw', linked_goal: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas'] })
      setSaved(true)
      setTimeout(onClose, 900)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    mut.mutate()
  }

  return createPortal(
    <div className="qc-overlay" onClick={onClose}>
      <div className="qc-modal" onClick={e => e.stopPropagation()}>
        {saved ? (
          <div className="qc-saved">💡 Idea captured!</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="qc-header">
              <span className="qc-icon">💡</span>
              <h3 className="qc-title">Quick Idea Capture</h3>
              <button type="button" className="qc-close" onClick={onClose}>✕</button>
            </div>
            <input
              ref={titleRef}
              className="form-input qc-input"
              placeholder="What's the idea?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <textarea
              className="form-input qc-textarea"
              placeholder="Context or details… (optional)"
              rows={3}
              value={context}
              onChange={e => setContext(e.target.value)}
            />
            <div className="qc-footer">
              <span className="qc-hint">Esc to cancel</span>
              <button className="btn-primary" type="submit" disabled={!title.trim() || mut.isPending}>
                {mut.isPending ? 'Saving…' : 'Capture →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
