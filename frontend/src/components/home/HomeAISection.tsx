// [AR] قسم الذكاء — الإجراء التالي والاقتراحات وشريط الحالة وآخر الإنجازات
// [EN] AI section — next action, suggestions, status strip, and recent wins
// Connects to: /api/core/next-action/, /api/core/command-center/ (via parent)

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CollapsibleSection } from '../CollapsibleSection'
import {
  getNextAction,
  actSuggestion,
  dismissSuggestion,
} from '../../lib/api'
import type {
  CommandCenterPayload,
  CommandCenterStatusCard,
  CommandCenterRecentProgressItem,
} from '../../lib/types'

interface HomeAISectionProps {
  statusCards: CommandCenterStatusCard[]
  suggestions: CommandCenterPayload['weekly_review']['pending_suggestions']
  recentProgress: CommandCenterRecentProgressItem[]
  reentry: CommandCenterPayload['reentry'] | undefined
}

// [AR] شريط الحالة — بطاقات ملونة لكل نطاق عمل
// [EN] Status strip — colour-coded tiles for each work domain
const STATUS_COLORS: Record<CommandCenterStatusCard['status'], { bg: string; border: string; text: string }> = {
  clear:     { bg: 'color-mix(in srgb, #16a34a 10%, var(--surface))', border: '#bbf7d0', text: '#15803d' },
  attention: { bg: 'color-mix(in srgb, #d97706 10%, var(--surface))', border: '#fde68a', text: '#b45309' },
  warning:   { bg: 'color-mix(in srgb, #dc2626 10%, var(--surface))', border: '#fecaca', text: '#dc2626' },
}

function StatusStrip({ cards }: { cards: CommandCenterStatusCard[] }) {
  if (!cards.length) return null
  return (
    <div className="cc-status-strip">
      {cards.map(card => {
        const c = STATUS_COLORS[card.status]
        return (
          <Link key={card.id} to={card.route} className="cc-status-tile"
            style={{ background: c.bg, borderColor: c.border }} title={card.detail}>
            <span className="cc-status-tile-label">{card.label}</span>
            <span className="cc-status-tile-value" style={{ color: c.text }}>
              {card.total > 0 ? `${card.value}/${card.total}` : card.detail || '—'}
            </span>
            <span className={`cc-status-dot cc-status-dot--${card.status}`} />
          </Link>
        )
      })}
    </div>
  )
}

// [AR] بانر العودة — يظهر عند العودة بعد غياب طويل
// [EN] Re-entry banner — shown when returning after an absence
function ReentryBanner({ reentry, onDismiss }: {
  reentry: CommandCenterPayload['reentry']
  onDismiss: () => void
}) {
  if (!reentry.active) return null
  return (
    <div className="cc-reentry-banner">
      <div className="cc-reentry-header">
        <span className="cc-reentry-title">👋 {reentry.message}</span>
        <button className="cc-reentry-dismiss" onClick={onDismiss} title="Dismiss">✕</button>
      </div>
      {reentry.what_changed.length > 0 && (
        <div className="cc-reentry-section">
          <p className="cc-reentry-section-label">What changed</p>
          <ul className="cc-reentry-list">
            {reentry.what_changed.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}
      {reentry.matters_now.length > 0 && (
        <div className="cc-reentry-section">
          <p className="cc-reentry-section-label">Matters now</p>
          <ul className="cc-reentry-list">
            {reentry.matters_now.slice(0, 2).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// [AR] بطاقة الإجراء التالي — توصية الذكاء الاصطناعي بالخطوة القادمة
// [EN] Next action card — AI recommendation for the immediate next step
function NextActionCard() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['next-action'],
    queryFn: getNextAction,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  return (
    <div className="next-action-card">
      <div className="next-action-header">
        <span className="next-action-label">⚡ What to do right now</span>
        <button className="next-action-refresh" onClick={() => refetch()}
          disabled={isFetching} title="Refresh recommendation">
          {isFetching ? '…' : '↺'}
        </button>
      </div>
      {isLoading && <p className="next-action-idle">Calculating…</p>}
      {data && !isLoading && (
        <div className="next-action-result">
          <p className="next-action-action">{data.action}</p>
          <p className="next-action-reason">{data.reason}</p>
          {data.node_id && (
            <Link to={`/goals?node=${data.node_id}`} className="next-action-link">Open goal →</Link>
          )}
        </div>
      )}
    </div>
  )
}

// [AR] اقتراحات الذكاء الاصطناعي — عناصر المراجعة الأسبوعية المعلقة
// [EN] AI suggestions — pending weekly review action items
function AISuggestions({ suggestions }: { suggestions: CommandCenterPayload['weekly_review']['pending_suggestions'] }) {
  const qc = useQueryClient()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const actMut = useMutation({
    mutationFn: (id: string) => actSuggestion(id),
    onSuccess: (_, id) => { setDismissed(p => new Set([...p, id])); qc.invalidateQueries({ queryKey: ['command-center'] }) },
  })
  const dismissMut = useMutation({
    mutationFn: (id: string) => dismissSuggestion(id),
    onSuccess: (_, id) => { setDismissed(p => new Set([...p, id])); qc.invalidateQueries({ queryKey: ['command-center'] }) },
  })

  const visible = suggestions.filter(s => !dismissed.has(s.id)).slice(0, 3)
  if (!visible.length) return null
  return (
    <div className="cc-suggestions">
      {visible.map(s => (
        <div key={s.id} className="cc-suggestion-card">
          <div className="cc-suggestion-body">
            <p className="cc-suggestion-topic">💡 {s.topic.replace(/_/g, ' ')}</p>
            <p className="cc-suggestion-text">{s.suggestion_text}</p>
          </div>
          <div className="cc-suggestion-actions">
            <button className="cc-suggestion-btn cc-suggestion-btn--act"
              onClick={() => actMut.mutate(s.id)} disabled={actMut.isPending || dismissMut.isPending}>✓ Done</button>
            <button className="cc-suggestion-btn cc-suggestion-btn--dismiss"
              onClick={() => dismissMut.mutate(s.id)} disabled={actMut.isPending || dismissMut.isPending}>✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// [AR] آخر الإنجازات — سجل التقدم الأخير
// [EN] Last wins — recent progress log
function LastWins({ items }: { items: CommandCenterRecentProgressItem[] }) {
  if (!items.length) return null
  return (
    <CollapsibleSection title="Recent Wins" storageKey="home-wins" defaultOpen={false}>
      <div className="cc-wins-list">
        {items.slice(0, 5).map(item => (
          <div key={item.id} className="cc-win-row">
            <span className="cc-win-icon">{item.kind === 'win' ? '🏆' : '✓'}</span>
            <div className="cc-win-body">
              <span className="cc-win-title">{item.title}</span>
              {item.detail && <span className="cc-win-detail">{item.detail}</span>}
            </div>
            <span className="cc-win-meta">{item.domain} · {item.date}</span>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  )
}

export function HomeAISection({ statusCards, suggestions, recentProgress, reentry }: HomeAISectionProps) {
  const [reentryDismissed, setReentryDismissed] = useState(false)
  return (
    <>
      {reentry && !reentryDismissed && (
        <ReentryBanner reentry={reentry} onDismiss={() => setReentryDismissed(true)} />
      )}
      <StatusStrip cards={statusCards} />
      <NextActionCard />
      {suggestions.length > 0 && <AISuggestions suggestions={suggestions} />}
      {recentProgress.length > 0 && <LastWins items={recentProgress} />}
    </>
  )
}
