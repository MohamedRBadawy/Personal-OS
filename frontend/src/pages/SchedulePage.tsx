import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { StatusPill } from '../components/StatusPill'
import {
  createScheduleLog,
  getTodaySchedule,
  sendChatMessage,
  updateGoalNode,
  updateScheduleLog,
} from '../lib/api'
import { formatDate, formatTime, titleCase } from '../lib/formatters'
import type { TodayScheduleBlock } from '../lib/types'

const blockStatuses = ['done', 'partial', 'late', 'skipped'] as const

export function SchedulePage() {
  const queryClient = useQueryClient()
  const scheduleQuery = useQuery({
    queryKey: ['today-schedule'],
    queryFn: getTodaySchedule,
  })

  const logMutation = useMutation({
    mutationFn: ({
      block,
      status,
    }: {
      block: TodayScheduleBlock
      status: (typeof blockStatuses)[number]
    }) => {
      const payload = {
        date: scheduleQuery.data!.date,
        block: block.id,
        status,
        task_node: block.log?.task_node?.id ?? block.suggestion?.goal_node?.id ?? null,
        note: block.log?.note ?? '',
      }

      return block.log
        ? updateScheduleLog(block.log.id, payload)
        : createScheduleLog(payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['today-schedule'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
      ])
    },
  })

  const markGoalDoneMutation = useMutation({
    mutationFn: (goalNodeId: string) => updateGoalNode(goalNodeId, { status: 'done' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['today-schedule'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
        queryClient.invalidateQueries({ queryKey: ['goal-tree'] }),
      ])
    },
  })

  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null)

  const aiAdjustMutation = useMutation({
    mutationFn: () => {
      const data = scheduleQuery.data!
      const adjustableBlocks = data.blocks
        .filter((b) => !b.is_fixed)
        .map((b) => ({
          id: b.id,
          time: b.time,
          label: b.label,
          type: b.type,
          duration_mins: b.duration_mins,
        }))
      const prompt = `[Context: Schedule adjustment] Here are today's adjustable schedule blocks: ${JSON.stringify(adjustableBlocks)}. Low energy: ${data.low_energy_today}. Reduced mode: ${data.reduced_mode}. Done: ${data.summary.done_count}, pending: ${data.summary.pending_count}. Suggest specific adjustments - what to prioritize, swap, or skip. Be concise and actionable.`
      return sendChatMessage([{ role: 'user', content: prompt }])
    },
    onSuccess: (result) => {
      setAiSuggestions(result.reply)
    },
  })

  if (scheduleQuery.isLoading) {
    return <section className="loading-state">Loading today&apos;s schedule...</section>
  }

  if (scheduleQuery.isError || !scheduleQuery.data) {
    return <section className="error-state">We could not load today&apos;s schedule.</section>
  }

  const schedule = scheduleQuery.data

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Schedule</p>
          <h2>Daily operating loop</h2>
          <p>Shape the day around real anchors, then record what actually happened.</p>
        </div>
        <div className="button-row">
          <StatusPill label={schedule.reduced_mode ? 'Reduced mode' : 'Standard mode'} />
          {schedule.template && (
            <button
              disabled={aiAdjustMutation.isPending}
              type="button"
              onClick={() => aiAdjustMutation.mutate()}
            >
              {aiAdjustMutation.isPending ? 'Generating...' : 'AI adjust'}
            </button>
          )}
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label="Done" value={`${schedule.summary.done_count}`} tone="success" />
        <MetricCard label="Pending" value={`${schedule.summary.pending_count}`} />
        <MetricCard label="Skipped" value={`${schedule.summary.skipped_count}`} tone="warning" />
        <MetricCard label="Due follow-ups" value={`${schedule.summary.due_follow_ups_count}`} />
      </div>

      <div className="two-column">
        <Panel
          title="Today at a glance"
          description={`Schedule for ${formatDate(schedule.date)}`}
          aside={schedule.template?.name ?? 'No active template'}
        >
          {schedule.template ? (
            <div className="stack">
              {schedule.notes.length > 0 ? (
                <ul className="signal-list">
                  {schedule.notes.map((note) => (
                    <li key={note} className="signal-item">
                      {note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No special adjustments are active right now.</p>
              )}
            </div>
          ) : (
            <EmptyState
              title="No active schedule"
              body="Create or seed a schedule template so the daily operating loop has something to render."
            />
          )}
        </Panel>

        <Panel
          title="Routing notes"
          description="Fixed anchors stay fixed. Adjustable slots can carry suggested work or follow-ups."
        >
          <div className="summary-strip">
            <div>
              <strong>Low energy</strong>
              <p>{schedule.low_energy_today ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <strong>Reduced mode</strong>
              <p>{schedule.reduced_mode ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <strong>Blocks</strong>
              <p>{schedule.blocks.length}</p>
            </div>
          </div>
        </Panel>
      </div>

      {aiSuggestions && (
        <Panel title="AI schedule suggestions" description="Recommendations based on your current energy and progress.">
          <div className="callout">
            <p className="eyebrow">AI adjustment</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{aiSuggestions}</p>
          </div>
        </Panel>
      )}

      <Panel title="Today&apos;s blocks" description="Log outcomes and optionally push linked work forward.">
        {!schedule.template ? (
          <EmptyState
            title="No active schedule"
            body="Once a template exists, this view will turn into the daily operating loop."
          />
        ) : (
          <div className="schedule-list">
            {schedule.blocks.map((block) => {
              const currentStatus = block.log?.status ?? 'not_logged'
              const canMarkGoalDone =
                currentStatus === 'done' &&
                block.log?.task_node &&
                block.log.task_node.status !== 'done'

              return (
                <article key={block.id} className="schedule-card">
                  <div className="schedule-card-header">
                    <div>
                      <p className="schedule-time">{formatTime(block.time)}</p>
                      <h3>{block.label}</h3>
                      <p className="muted">
                        {titleCase(block.type)} - {block.duration_mins} mins
                      </p>
                    </div>
                    <div className="list-inline">
                      <StatusPill label={currentStatus} />
                      {block.is_fixed ? <StatusPill label="fixed" /> : null}
                    </div>
                  </div>

                  <div className="stack">
                    <div className="schedule-reason">
                      <strong>Scheduler note</strong>
                      <p>{block.suggestion_reason}</p>
                    </div>

                    {block.suggestion ? (
                      <div className="schedule-suggestion">
                        <strong>
                          {block.suggestion.kind === 'goal_node' ? 'Suggested work' : 'Suggested follow-up'}
                        </strong>
                        {block.suggestion.goal_node ? (
                          <p>
                            {block.suggestion.goal_node.title}
                            {block.suggestion.goal_node.parent_title
                              ? ` - ${block.suggestion.goal_node.parent_title}`
                              : ''}
                          </p>
                        ) : (
                          <p>
                            {block.suggestion.marketing_action?.action} - {block.suggestion.marketing_action?.platform}
                          </p>
                        )}
                      </div>
                    ) : null}

                    <div className="button-row">
                      {blockStatuses.map((status) => (
                        <button
                          key={status}
                          className={status === currentStatus ? 'button-muted active' : 'button-muted'}
                          type="button"
                          onClick={() => logMutation.mutate({ block, status })}
                        >
                          {logMutation.isPending ? 'Saving...' : titleCase(status)}
                        </button>
                      ))}
                    </div>

                    {canMarkGoalDone ? (
                      <div className="button-row">
                        <button
                          className="button-ghost"
                          type="button"
                          onClick={() => markGoalDoneMutation.mutate(block.log!.task_node!.id)}
                        >
                          {markGoalDoneMutation.isPending ? 'Updating goal...' : 'Mark linked goal done'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Panel>
    </section>
  )
}
