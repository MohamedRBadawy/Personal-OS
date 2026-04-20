// [AR] نافذة التقاط سريع — تقبل أي إدخال بدون حقول إلزامية وتقترح النطاق تلقائياً
// [EN] Quick capture modal — zero required fields, auto domain suggestion, user override
// Connects to: POST /api/analytics/ideas/, GET /api/analytics/ideas/suggest-domain/

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createIdea, suggestDomain } from '../lib/api'

// [AR] أسماء النطاقات السبعة للعرض في قائمة التجاوز
// [EN] Seven hub domain labels for the domain override selector
const HUB_DOMAINS = [
  { value: 'now',          label: '⚡ Now'          },
  { value: 'goals',        label: '🎯 Goals'        },
  { value: 'build',        label: '🏗 Build'        },
  { value: 'life',         label: '💚 Life'         },
  { value: 'learn',        label: '📚 Learn'        },
  { value: 'intelligence', label: '🔍 Intelligence' },
  { value: 'profile',      label: '👤 Profile'      },
]

interface Props {
  onClose: () => void
}

export function QuickCaptureModal({ onClose }: Props) {
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [saved, setSaved] = useState(false)
  const [suggestedDomain, setSuggestedDomain] = useState<string | null>(null)
  const [domainOverride, setDomainOverride] = useState<string>('')
  const titleRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    titleRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // [AR] اقتراح النطاق بتأخير 300ms عند الكتابة
  // [EN] Debounced domain suggestion — fires 300ms after the user stops typing
  function handleTitleChange(value: string) {
    setTitle(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (value.trim().length >= 2) {
        try {
          const result = await suggestDomain(value)
          if (result.suggested_domain) {
            setSuggestedDomain(result.suggested_domain)
            if (!domainOverride) setDomainOverride(result.suggested_domain)
          }
        } catch {
          // suggestion failure is silent
        }
      } else {
        setSuggestedDomain(null)
      }
    }, 300)
  }

  const mut = useMutation({
    mutationFn: () => createIdea({
      title: title.trim() || '(untitled)',
      context,
      status: 'raw',
      linked_goal: null,
      domain_hint: domainOverride || suggestedDomain || undefined,
    } as Parameters<typeof createIdea>[0]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas'] })
      setSaved(true)
      setTimeout(onClose, 900)
    },
  })

  const activeDomain = domainOverride || suggestedDomain
  const activeHubLabel = HUB_DOMAINS.find(h => h.value === activeDomain)?.label

  return createPortal(
    <div className="qc-overlay" onClick={onClose}>
      <div className="qc-modal" onClick={e => e.stopPropagation()}>
        {saved ? (
          <div className="qc-saved">💡 Captured{activeDomain ? ` → ${activeHubLabel}` : ''}!</div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); mut.mutate() }}>
            <div className="qc-header">
              <span className="qc-icon">💡</span>
              <h3 className="qc-title">Quick Capture</h3>
              <button type="button" className="qc-close" onClick={onClose}>✕</button>
            </div>

            {/* [AR] حقل العنوان — اختياري، يقترح النطاق عند الكتابة */}
            {/* [EN] Title field — optional, triggers domain suggestion while typing */}
            <input
              ref={titleRef}
              className="form-input qc-input"
              placeholder="What's on your mind? (optional)"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
            />

            {/* [AR] اقتراح النطاق وقائمة التجاوز */}
            {/* [EN] Domain suggestion chip and override selector */}
            <div className="qc-domain-row">
              {activeDomain && (
                <span className="qc-domain-chip">
                  {activeHubLabel}
                  {suggestedDomain && domainOverride === suggestedDomain && (
                    <span className="qc-domain-auto"> auto</span>
                  )}
                </span>
              )}
              <select
                className="form-input qc-domain-select"
                value={domainOverride}
                onChange={e => setDomainOverride(e.target.value)}
              >
                <option value="">Route to…</option>
                {HUB_DOMAINS.map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>

            <textarea
              className="form-input qc-textarea"
              placeholder="Context or details… (optional)"
              rows={3}
              value={context}
              onChange={e => setContext(e.target.value)}
            />

            <div className="qc-footer">
              <span className="qc-hint">Esc to cancel</span>
              <button className="btn-primary" type="submit" disabled={mut.isPending}>
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
