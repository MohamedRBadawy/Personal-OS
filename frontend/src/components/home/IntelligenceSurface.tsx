// [AR] سطح الذكاء الرئيسي - يجيب عن أسئلة الصفحة الرئيسية الأربعة من حمولة مركز القيادة
// [EN] Primary intelligence surface - answers the four home questions from the command-center payload
// Connects to: HomePage, CommandCenterService.payload(), HomeAISection.StatusStrip

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { StatusStrip } from './HomeAISection'
import { TopPriorityCard } from './HomePrioritiesSection'
import { CommitmentAccountabilityPanel } from './CommitmentAccountabilityPanel'
import { DecisionInsightCard } from './DecisionInsightCard'
import {
  DEFAULT_QUESTION_PANEL_OPEN,
  type QuestionPanelId,
  type QuestionPanelOpenState,
} from './homeState'
import type { CommandCenterPayload, CommandCenterPriorityItem } from '../../lib/types'

type IntelligenceSurfaceProps = {
  cc: CommandCenterPayload
}

type QuestionPanelProps = {
  id: QuestionPanelId
  title: string
  subtitle: string
  open: boolean
  onToggle: (id: QuestionPanelId) => void
  children: ReactNode
}

function formatValue(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined) return 'Not logged'
  return `${Math.round(value * 10) / 10}${suffix}`
}

function QuestionPanel({ id, title, subtitle, open, onToggle, children }: QuestionPanelProps) {
  return (
    <section className="intelligence-panel" data-testid={`intelligence-${id}`}>
      <button className="intelligence-panel-header" type="button" onClick={() => onToggle(id)}>
        <span>
          <span className="intelligence-panel-title">{title}</span>
          <span className="intelligence-panel-subtitle">{subtitle}</span>
        </span>
        <ChevronDown className={`intelligence-chevron ${open ? 'open' : ''}`} size={18} aria-hidden="true" />
      </button>
      {open && <div className="intelligence-panel-body">{children}</div>}
    </section>
  )
}

function ReadyRow({ item }: { item: CommandCenterPriorityItem }) {
  return (
    <Link to={`/goals?node=${item.id}`} className="ready-row">
      <span className="ready-row-title">{item.title}</span>
      <span className="ready-row-meta">{item.effort || 'Effort not set'}</span>
      <span className="ready-row-tool">{item.recommended_tool || 'Tool not set'}</span>
    </Link>
  )
}

function BlockerRow({ item }: { item: CommandCenterPriorityItem }) {
  return (
    <Link to={`/goals?node=${item.id}`} className="blocker-row">
      <span className="blocker-row-title">{item.title}</span>
      <span className="blocker-row-blockers">
        {item.blocked_by_titles.length ? item.blocked_by_titles.join(', ') : 'Blocker not named yet'}
      </span>
    </Link>
  )
}

function TrendRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="trend-row">
      <span className="trend-row-label">{label}</span>
      <span className="trend-row-value">{value}</span>
      <span className="trend-row-detail">{detail}</span>
    </div>
  )
}

export function IntelligenceSurface({ cc }: IntelligenceSurfaceProps) {
  const [questionPanelOpen, setQuestionPanelOpen] = useState<QuestionPanelOpenState>(DEFAULT_QUESTION_PANEL_OPEN)
  const [activePriorityId, setActivePriorityId] = useState<string | null>(null)
  const [statusOpen, setStatusOpen] = useState(true)

  function togglePanel(id: QuestionPanelId) {
    setQuestionPanelOpen(current => ({ ...current, [id]: !current[id] }))
  }

  const topPriority = cc.priorities[0]
  const readyItems = cc.priorities.filter(item => item.status === 'available').slice(0, 3)
  const blockedItems = cc.priorities.filter(item => item.status === 'blocked')
  const activeNodeIds = cc.priorities.filter(item => item.status === 'active').map(item => item.id)
  const health = cc.health_today.summary
  const finance = cc.finance.summary

  return (
    <div className="intelligence-surface" aria-label="Home intelligence surface">
      <QuestionPanel
        id="q1"
        title="What matters most?"
        subtitle="The highest leverage item in the system"
        open={questionPanelOpen.q1}
        onToggle={togglePanel}
      >
        {cc.overwhelm.reduced_mode && (
          <div className="overwhelm-banner">
            <strong>Reduced mode is on.</strong>
            <span>Keep today narrow: max {cc.overwhelm.max_priorities} priorities.</span>
          </div>
        )}
        {topPriority ? (
          <TopPriorityCard
            item={topPriority}
            isActive={activePriorityId === topPriority.id}
            onToggle={() => setActivePriorityId(current => current === topPriority.id ? null : topPriority.id)}
          />
        ) : (
          <p className="empty-hint">No priorities are ranked yet.</p>
        )}
      </QuestionPanel>

      <QuestionPanel
        id="q2"
        title="What am I ready to act on?"
        subtitle="Available work only, excluding blocked or done items"
        open={questionPanelOpen.q2}
        onToggle={togglePanel}
      >
        {readyItems.length ? (
          <div className="ready-list">
            {readyItems.map(item => <ReadyRow key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="empty-hint">No available goals or tasks are ready right now.</p>
        )}
      </QuestionPanel>

      <QuestionPanel
        id="q3"
        title="What is blocking me?"
        subtitle="Blocked work with the named blocker attached"
        open={questionPanelOpen.q3}
        onToggle={togglePanel}
      >
        <DecisionInsightCard activeNodeIds={activeNodeIds} />
        {blockedItems.length ? (
          <div className="blocker-list">
            {blockedItems.map(item => <BlockerRow key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="empty-hint">No blocked priority is visible in the command-center payload.</p>
        )}
      </QuestionPanel>

      <QuestionPanel
        id="q4"
        title="How am I doing?"
        subtitle="Seven-day trend, north-star progress, and system signals"
        open={questionPanelOpen.q4}
        onToggle={togglePanel}
      >
        <div className="trend-grid">
          <TrendRow label="Sleep 7d" value={formatValue(health.avg_sleep_7d, 'h')} detail="Average sleep" />
          <TrendRow label="Mood 7d" value={formatValue(health.avg_mood_7d, '/5')} detail="Average mood" />
          <TrendRow label="Habits 7d" value={formatValue(health.habit_completion_rate_7d, '%')} detail="Completion rate" />
          <TrendRow label="Kyrgyzstan" value={formatValue(finance.kyrgyzstan_progress_pct, '%')} detail="Income trigger progress" />
        </div>

        {cc.key_signals.length > 0 && (
          <ul className="signal-list" aria-label="Key signals">
            {cc.key_signals.map(signal => <li key={signal}>{signal}</li>)}
          </ul>
        )}

        <CommitmentAccountabilityPanel commitments={cc.prior_commitments_due ?? []} />

        <div className="status-collapse">
          <button className="status-collapse-button" type="button" onClick={() => setStatusOpen(open => !open)}>
            <span>Domain tiles</span>
            <ChevronDown className={`intelligence-chevron ${statusOpen ? 'open' : ''}`} size={16} aria-hidden="true" />
          </button>
          {statusOpen && <StatusStrip cards={cc.status_cards} />}
        </div>
      </QuestionPanel>
    </div>
  )
}
