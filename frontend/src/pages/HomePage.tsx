import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { FinanceEntryForm } from '../components/FinanceEntryForm'
import { HabitBoard } from '../components/HabitBoard'
import { HealthLogForm } from '../components/HealthLogForm'
import { MoodLogForm } from '../components/MoodLogForm'
import { Panel } from '../components/Panel'
import { PipelineOpportunityForm } from '../components/PipelineOpportunityForm'
import { SpiritualLogForm } from '../components/SpiritualLogForm'
import { StatusPill } from '../components/StatusPill'
import { CommandPriorityCard } from '../components/command-center/CommandPriorityCard'
import { CommandScheduleCard } from '../components/command-center/CommandScheduleCard'
import { CommandStatusCard } from '../components/command-center/CommandStatusCard'
import {
  createFinanceEntry,
  createHabitLog,
  createHealthLog,
  createMoodLog,
  createOpportunity,
  createScheduleLog,
  createSpiritualLog,
  getCommandCenter,
  sendChatMessage,
  updateGoalNode,
  updateHabitLog,
  updateHealthLog,
  updateMarketingAction,
  updateMoodLog,
  updateOpportunity,
  updateScheduleBlock,
  updateScheduleLog,
  updateSpiritualLog,
} from '../lib/api'
import { formatCurrency, formatDate, formatPercent, titleCase } from '../lib/formatters'
import type {
  ChatProposedAction,
  HabitBoardItem,
  Opportunity,
  OpportunityPayload,
  ScheduleBlockPayload,
  TodayScheduleBlock,
} from '../lib/types'

const quickActions = [
  { id: 'task', label: 'Task', template: 'Create a task: ' },
  { id: 'expense', label: 'Expense', template: 'Log an expense: ' },
  { id: 'health', label: 'Health', template: 'Log health for today: ' },
  { id: 'mood', label: 'Mood', template: 'Log mood for today: ' },
  { id: 'spiritual', label: 'Spiritual', template: 'Log spiritual progress for today: ' },
  { id: 'habit', label: 'Habit', template: 'Mark this habit done today: ' },
  { id: 'idea', label: 'Idea', template: 'Capture this idea: ' },
  { id: 'marketing', label: 'Marketing', template: 'Record this marketing action: ' },
  { id: 'achievement', label: 'Achievement', template: 'Record this achievement: ' },
  { id: 'decision', label: 'Decision', template: 'Log this decision: ' },
] as const

const moduleQueryKeys: Record<string, string[][]> = {
  analytics: [['analytics-overview'], ['weekly-review-preview'], ['suggestions']],
  finance: [['finance-summary'], ['finance-entries']],
  goals: [['goal-tree'], ['goal-map']],
  health: [['health-today'], ['health-summary'], ['health-logs'], ['health-moods']],
  pipeline: [['pipeline-workspace']],
  schedule: [['today-schedule']],
}

function greetingForNow() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

async function invalidateCommandCenter(queryClient: ReturnType<typeof useQueryClient>, modules: string[] = []) {
  const keys = [['command-center'], ['dashboard']]
  for (const module of modules) {
    for (const key of moduleQueryKeys[module] ?? []) keys.push(key)
  }
  const uniqueKeys = keys.filter(
    (key, index) => keys.findIndex((candidate) => candidate.join(':') === key.join(':')) === index,
  )
  await Promise.all(uniqueKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export function HomePage() {
  const queryClient = useQueryClient()
  const [captureText, setCaptureText] = useState('')
  const [captureAction, setCaptureAction] = useState<(typeof quickActions)[number]['id'] | null>(null)
  const [captureReply, setCaptureReply] = useState<string | null>(null)
  const [captureReview, setCaptureReview] = useState<{ text: string; actions: ChatProposedAction[] } | null>(null)
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null)

  const commandCenterQuery = useQuery({
    queryKey: ['command-center'],
    queryFn: getCommandCenter,
  })

  const captureMutation = useMutation({
    mutationFn: ({ text, quickAction }: { text: string; quickAction: string | null }) =>
      sendChatMessage(
        [{ role: 'user', content: text }],
        { surface: 'command_center', mode: 'command_center_capture', quick_action: quickAction },
      ),
    onSuccess: async (result, variables) => {
      setCaptureReply(result.reply)
      if (result.requires_confirmation && result.proposed_actions?.length) {
        setCaptureReview({ text: variables.text, actions: result.proposed_actions })
        return
      }
      setCaptureReview(null)
      setCaptureText('')
      setCaptureAction(null)
      await invalidateCommandCenter(queryClient, result.affected_modules)
    },
  })
  const confirmCaptureMutation = useMutation({
    mutationFn: ({ text, actions }: { text: string; actions: ChatProposedAction[] }) =>
      sendChatMessage(
        [{ role: 'user', content: text }],
        {
          surface: 'command_center',
          mode: 'command_center_capture',
          confirm_capture: true,
          proposed_actions: actions,
        },
      ),
    onSuccess: async (result) => {
      setCaptureReply(result.reply)
      setCaptureReview(null)
      setCaptureText('')
      setCaptureAction(null)
      await invalidateCommandCenter(queryClient, result.affected_modules)
    },
  })

  const priorityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateGoalNode>[1] }) => updateGoalNode(id, payload),
    onSuccess: async () => invalidateCommandCenter(queryClient, ['goals', 'schedule', 'health']),
  })
  const scheduleBlockMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ScheduleBlockPayload> }) => updateScheduleBlock(id, payload),
    onSuccess: async () => invalidateCommandCenter(queryClient, ['schedule']),
  })
  const scheduleLogMutation = useMutation({
    mutationFn: ({ block, date, status }: { block: TodayScheduleBlock; date: string; status: 'done' | 'partial' | 'late' | 'skipped' }) => {
      const payload = {
        date,
        block: block.id,
        status,
        task_node: block.log?.task_node?.id ?? block.suggestion?.goal_node?.id ?? null,
        note: block.log?.note ?? '',
      }
      return block.log ? updateScheduleLog(block.log.id, payload) : createScheduleLog(payload)
    },
    onSuccess: async () => invalidateCommandCenter(queryClient, ['schedule', 'goals']),
  })
  const healthLogMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createHealthLog>[0] & { id?: string | null }) =>
      payload.id ? updateHealthLog(payload.id, payload) : createHealthLog(payload),
    onSuccess: async () => invalidateCommandCenter(queryClient, ['health', 'schedule', 'goals']),
  })
  const moodMutation = useMutation({
    mutationFn: (payload: { id?: string | null } & Parameters<typeof createMoodLog>[0]) =>
      payload.id ? updateMoodLog(payload.id, payload) : createMoodLog(payload),
    onSuccess: async () => invalidateCommandCenter(queryClient, ['health', 'schedule', 'goals']),
  })
  const spiritualMutation = useMutation({
    mutationFn: (payload: { id?: string | null } & Parameters<typeof createSpiritualLog>[0]) =>
      payload.id ? updateSpiritualLog(payload.id, payload) : createSpiritualLog(payload),
    onSuccess: async () => invalidateCommandCenter(queryClient, ['health', 'schedule', 'goals']),
  })
  const habitMutation = useMutation({
    mutationFn: ({ item, done, date }: { item: HabitBoardItem; done: boolean; date: string }) => {
      const payload = { habit: item.habit.id, date, done, note: item.today_log?.note ?? '' }
      return item.today_log ? updateHabitLog(item.today_log.id, payload) : createHabitLog(payload)
    },
    onSuccess: async () => invalidateCommandCenter(queryClient, ['health', 'schedule', 'goals']),
  })
  const financeMutation = useMutation({
    mutationFn: createFinanceEntry,
    onSuccess: async () => invalidateCommandCenter(queryClient, ['finance', 'goals', 'analytics']),
  })
  const opportunityMutation = useMutation({
    mutationFn: (payload: OpportunityPayload) => editingOpportunity ? updateOpportunity(editingOpportunity.id, payload) : createOpportunity(payload),
    onSuccess: async () => {
      setEditingOpportunity(null)
      await invalidateCommandCenter(queryClient, ['pipeline', 'analytics'])
    },
  })
  const opportunityStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Opportunity['status'] }) => updateOpportunity(id, { status }),
    onSuccess: async () => invalidateCommandCenter(queryClient, ['pipeline', 'analytics']),
  })
  const followUpMutation = useMutation({
    mutationFn: (id: string) => updateMarketingAction(id, { follow_up_done: true }),
    onSuccess: async () => invalidateCommandCenter(queryClient, ['pipeline']),
  })

  if (commandCenterQuery.isLoading) return <section className="loading-state">Loading command center...</section>
  if (commandCenterQuery.isError || !commandCenterQuery.data) return <section className="error-state">We could not load the command center.</section>

  const commandCenter = commandCenterQuery.data
  const displayName = commandCenter.profile?.full_name?.split(' ')[0] ?? 'Mohamed'
  const priorities = commandCenter.priorities.length > 0 ? commandCenter.priorities : commandCenter.top_priorities

  return (
    <section className="page">
      <div className="hero-panel command-hero">
        <div className="hero-copy">
          <p className="eyebrow">Command Center</p>
          <h2>{greetingForNow()}, {displayName}.</h2>
          <p className="hero-summary">{commandCenter.briefing.briefing_text}</p>
          <p className="muted">Updated for {formatDate(commandCenter.date)}. {commandCenter.briefing.encouragement}</p>
          {commandCenter.key_signals.length > 0 ? (
            <ul className="signal-list">
              {commandCenter.key_signals.map((signal) => <li key={signal} className="signal-item">{signal}</li>)}
            </ul>
          ) : null}
        </div>

        <div className="hero-status">
          <StatusPill label={commandCenter.overwhelm.reduced_mode ? 'Reduced mode' : 'Full mode'} />
          <div className="hero-kyrgyzstan">
            <p className="eyebrow">North star</p>
            <strong>{formatPercent(commandCenter.finance.summary.kyrgyzstan_progress_pct)}</strong>
            <p className="muted">{formatCurrency(commandCenter.finance.summary.independent_income_eur)} of {formatCurrency(commandCenter.finance.summary.target_eur)} independent income</p>
          </div>
        </div>
      </div>

      {commandCenter.reentry.active ? (
        <div className="callout">
          <p className="eyebrow">Re-entry</p>
          <p>{commandCenter.reentry.message}</p>
          <div className="command-reentry-grid">
            <div><strong>What changed</strong><ul className="plain-list">{commandCenter.reentry.what_changed.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><strong>What matters now</strong><ul className="plain-list">{commandCenter.reentry.matters_now.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><strong>What can wait</strong><ul className="plain-list">{commandCenter.reentry.can_wait.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </div>
      ) : null}

      <div className="command-status-grid">
        {commandCenter.status_cards.map((card) => <CommandStatusCard key={card.id} card={card} />)}
      </div>

      <div className="two-column">
        <Panel title="Unified capture" description="Capture across domains from one inbox or start with a quick action." aside={captureAction ? <StatusPill label={captureAction} /> : 'Smart inbox'}>
          <div className="command-capture__actions">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className={captureAction === action.id ? 'button-muted active' : 'button-muted'}
                type="button"
                onClick={() => {
                  setCaptureAction(action.id)
                  setCaptureText(action.template)
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
          <form className="stack" onSubmit={(event) => {
            event.preventDefault()
            if (captureText.trim()) captureMutation.mutate({ text: captureText.trim(), quickAction: captureAction })
          }}>
            <div className="field">
              <label htmlFor="command-capture">Capture input</label>
              <textarea id="command-capture" value={captureText} onChange={(event) => setCaptureText(event.target.value)} />
            </div>
            <div className="button-row">
              <button disabled={captureMutation.isPending || !captureText.trim()} type="submit">{captureMutation.isPending ? 'Capturing...' : 'Process capture'}</button>
              <button className="button-ghost" type="button" onClick={() => { setCaptureAction(null); setCaptureReply(null); setCaptureReview(null); setCaptureText('') }}>Clear</button>
            </div>
          </form>
          {captureReview ? (
            <div className="command-inline-note">
              <strong>Review before apply</strong>
              <ul className="plain-list">
                {captureReview.actions.map((action) => (
                  <li key={`${action.tool}-${action.summary}`} className="context-item">
                    {action.summary}
                  </li>
                ))}
              </ul>
              <div className="button-row">
                <button
                  disabled={confirmCaptureMutation.isPending}
                  type="button"
                  onClick={() => confirmCaptureMutation.mutate(captureReview)}
                >
                  {confirmCaptureMutation.isPending ? 'Applying...' : 'Confirm and apply'}
                </button>
                <button className="button-ghost" type="button" onClick={() => setCaptureReview(null)}>
                  Keep editing
                </button>
              </div>
            </div>
          ) : null}
          {captureReply ? <div className="command-inline-note"><strong>AI result</strong><p>{captureReply}</p></div> : null}
        </Panel>

        <Panel title="Weekly review and wins" description="Keep recent progress and review pressure visible." aside={<Link className="button-link" to="/timeline?tab=review">Open review</Link>}>
          <div className="summary-strip">
            <div><strong>{commandCenter.weekly_review.pending_suggestions_count}</strong><p className="muted">Pending suggestions</p></div>
            <div><strong>{commandCenter.weekly_review.status.review_exists ? 'Saved' : 'Open'}</strong><p className="muted">This week review</p></div>
            <div><strong>{formatDate(commandCenter.weekly_review.status.week_end)}</strong><p className="muted">Week closes</p></div>
          </div>
          <p>{commandCenter.weekly_review.preview.snippet ?? commandCenter.weekly_review.preview.report}</p>
          <div className="record-list">
            {commandCenter.recent_progress.length === 0 ? <EmptyState title="No wins yet" body="Completions and wins will collect here." /> : commandCenter.recent_progress.map((item) => (
              <article key={item.id} className="record-card">
                <div className="record-card-header">
                  <div><h3>{item.title}</h3><div className="list-inline"><span className="record-meta-chip">{item.domain}</span><span className="record-meta-chip">{formatDate(item.date)}</span></div></div>
                  <StatusPill label={item.kind === 'win' ? 'done' : 'active'} />
                </div>
                <p className="muted">{item.detail}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Priority stack" description="Edit the active priorities directly here and keep the list narrow.">
        {priorities.length === 0 ? <EmptyState title="No active priorities" body="Capture new work or activate a node to surface the next move." /> : (
          <div className="record-list">
            {priorities.map((priority) => (
              <CommandPriorityCard
                key={priority.id}
                isSaving={priorityMutation.isPending && priorityMutation.variables?.id === priority.id}
                priority={priority}
                onSave={(payload) => priorityMutation.mutate({ id: priority.id, payload: { title: payload.title, notes: payload.notes, status: payload.status, due_date: payload.dueDate, manual_priority: payload.manualPriority } })}
                onMarkDone={() => priorityMutation.mutate({ id: priority.id, payload: { status: 'done' } })}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Today's schedule" description="See the full day, adjust blocks inline, and log what actually happened." aside={<Link className="button-link" to="/work?tab=schedule">Open execution</Link>}>
        {commandCenter.schedule.blocks.length === 0 ? <EmptyState title="No schedule blocks" body="Activate a schedule template to turn this into the daily loop." /> : (
          <div className="schedule-list">
            {commandCenter.schedule.blocks.map((block) => (
              <CommandScheduleCard
                key={block.id}
                block={block}
                date={commandCenter.schedule.date}
                isSaving={(scheduleBlockMutation.isPending && scheduleBlockMutation.variables?.id === block.id) || (scheduleLogMutation.isPending && scheduleLogMutation.variables?.block.id === block.id)}
                onSaveBlock={(payload) => scheduleBlockMutation.mutate({ id: block.id, payload })}
                onLogStatus={(status) => scheduleLogMutation.mutate({ block, date: commandCenter.schedule.date, status })}
              />
            ))}
          </div>
        )}
      </Panel>

      <div className="dashboard-grid">
        <div className="stack">
          <Panel title="Body and energy" description="Update today's body log so the system can adapt around real capacity.">
            <HealthLogForm
              key={commandCenter.health_today.health_log?.id ?? `health-${commandCenter.health_today.date}`}
              initialValue={commandCenter.health_today.health_log}
              isSubmitting={healthLogMutation.isPending}
              today={commandCenter.health_today.date}
              onSubmit={(payload) => healthLogMutation.mutate({ ...payload, id: commandCenter.health_today.health_log?.id })}
            />
          </Panel>
          <Panel title="Mood" description="Keep the emotional read honest so prioritization stays realistic.">
            <MoodLogForm
              key={commandCenter.health_today.mood_log?.id ?? `mood-${commandCenter.health_today.date}`}
              initialValue={commandCenter.health_today.mood_log}
              isSubmitting={moodMutation.isPending}
              today={commandCenter.health_today.date}
              onSubmit={(payload) => moodMutation.mutate({ ...payload, id: commandCenter.health_today.mood_log?.id })}
            />
          </Panel>
          <Panel title="Spiritual" description="Log prayer, Quran, and dhikr without leaving the main page.">
            <SpiritualLogForm
              key={commandCenter.health_today.spiritual_log?.id ?? `spiritual-${commandCenter.health_today.date}`}
              initialValue={commandCenter.health_today.spiritual_log}
              isSubmitting={spiritualMutation.isPending}
              today={commandCenter.health_today.date}
              onSubmit={(payload) => spiritualMutation.mutate({ ...payload, id: commandCenter.health_today.spiritual_log?.id })}
            />
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Habits" description="Toggle today's habits from the same page." aside={`${commandCenter.health_today.summary.habits_completed_today}/${commandCenter.health_today.summary.active_habits_count} done`}>
            <HabitBoard
              items={commandCenter.health_today.habit_board}
              pendingHabitId={habitMutation.isPending ? habitMutation.variables?.item.habit.id ?? null : null}
              onToggle={(item, done) => habitMutation.mutate({ item, done, date: commandCenter.health_today.date })}
            />
          </Panel>

          <Panel title="Finance" description="Add a transaction and see recent money movement immediately." aside={<Link className="button-link" to="/finance?tab=ledger">Open ledger</Link>}>
            <div className="summary-strip">
              <div><strong>{formatCurrency(commandCenter.finance.summary.independent_income_eur)}</strong><p className="muted">Independent income</p></div>
              <div><strong>{formatCurrency(commandCenter.finance.summary.net_eur)}</strong><p className="muted">Net this month</p></div>
              <div><strong>{commandCenter.finance.summary.months_to_target ?? '-'}</strong><p className="muted">Months to target</p></div>
            </div>
            <FinanceEntryForm isSubmitting={financeMutation.isPending} onSubmit={(payload) => financeMutation.mutate(payload)} />
            <div className="record-list">
              {commandCenter.finance.recent_entries.map((entry) => (
                <article key={entry.id} className="record-card">
                  <div className="record-card-header">
                    <div><h3>{entry.source}</h3><div className="list-inline"><span className="record-meta-chip">{titleCase(entry.type)}</span><span className="record-meta-chip">{entry.currency}</span><span className="record-meta-chip">{formatDate(entry.date)}</span></div></div>
                    <strong>{formatCurrency(entry.amount_eur)}</strong>
                  </div>
                  <p className="muted">{entry.notes || 'No notes recorded.'}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="two-column">
        <Panel title="Pipeline pressure" description="See due follow-ups, update opportunity status, and add new leads from the same surface." aside={<Link className="button-link" to="/work?tab=pipeline">Open work view</Link>}>
          <div className="summary-strip">
            <div><strong>{commandCenter.pipeline.summary.due_follow_ups_count}</strong><p className="muted">Due follow-ups</p></div>
            <div><strong>{commandCenter.pipeline.summary.new_or_reviewing_count}</strong><p className="muted">Active leads</p></div>
            <div><strong>{commandCenter.pipeline.summary.won_count}</strong><p className="muted">Won</p></div>
          </div>
          <div className="record-list">
            {commandCenter.pipeline.due_follow_ups.map((action) => (
              <article key={action.id} className="record-card">
                <div className="record-card-header">
                  <div><h3>{action.action}</h3><div className="list-inline"><span className="record-meta-chip">{action.platform}</span><span className="record-meta-chip">{action.follow_up_date ? formatDate(action.follow_up_date) : 'Due now'}</span></div></div>
                  <button disabled={followUpMutation.isPending} type="button" onClick={() => followUpMutation.mutate(action.id)}>{followUpMutation.isPending && followUpMutation.variables === action.id ? 'Saving...' : 'Mark done'}</button>
                </div>
                <p className="muted">{action.result || 'No result recorded yet.'}</p>
              </article>
            ))}
            {commandCenter.pipeline.due_follow_ups.length === 0 ? <EmptyState title="No follow-ups due" body="As follow-up dates come due, the pressure list will appear here." /> : null}
          </div>
          <div className="record-list">
            {commandCenter.pipeline.active_opportunities.slice(0, 3).map((opportunity) => (
              <article key={opportunity.id} className="record-card">
                <div className="record-card-header">
                  <div><h3>{opportunity.name}</h3><div className="list-inline"><span className="record-meta-chip">{opportunity.platform}</span><StatusPill label={opportunity.status} /></div></div>
                  <button className="button-muted" type="button" onClick={() => setEditingOpportunity({ id: opportunity.id, name: opportunity.name, platform: opportunity.platform, description: opportunity.description ?? '', budget: opportunity.budget, status: opportunity.status, fit_score: opportunity.fit_score, fit_reasoning: opportunity.fit_reasoning ?? '', date_found: opportunity.date_found, date_applied: opportunity.date_applied, date_closed: opportunity.date_closed ?? null, proposal_draft: opportunity.proposal_draft ?? '', outcome_notes: opportunity.outcome_notes, created_at: '', updated_at: '' })}>Edit</button>
                </div>
                <p className="muted">{opportunity.fit_reasoning || opportunity.description || 'No fit reasoning yet.'}</p>
                <div className="button-row">
                  {(['applied', 'won', 'lost'] as const).map((status) => (
                    <button key={status} className={opportunity.status === status ? 'button-muted active' : 'button-muted'} disabled={opportunityStatusMutation.isPending} type="button" onClick={() => opportunityStatusMutation.mutate({ id: opportunity.id, status })}>{titleCase(status)}</button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title={editingOpportunity ? 'Edit opportunity' : 'Add opportunity'} description="Keep pipeline creation on the main page too.">
          <PipelineOpportunityForm initialValue={editingOpportunity} isSubmitting={opportunityMutation.isPending} onSubmit={(payload) => opportunityMutation.mutate(payload)} />
        </Panel>
      </div>

      <Panel title="Pending suggestions" description="What the system still thinks deserves attention right now.">
        {commandCenter.weekly_review.pending_suggestions.length === 0 ? <EmptyState title="No pending suggestions" body="The command center is currently clear on review nudges." /> : (
          <div className="record-list">
            {commandCenter.weekly_review.pending_suggestions.map((suggestion) => (
              <article key={suggestion.id} className="record-card">
                <div className="record-card-header">
                  <div><h3>{titleCase(suggestion.topic)}</h3><div className="list-inline"><span className="record-meta-chip">{titleCase(suggestion.module)}</span><span className="record-meta-chip">{formatDate(suggestion.shown_at)}</span></div></div>
                </div>
                <p className="muted">{suggestion.suggestion_text}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </section>
  )
}
