import { useEffect, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { ReviewNotesForm } from '../components/ReviewNotesForm'
import {
  actSuggestion,
  dismissSuggestion,
  generateWeeklyReview,
  getAnalyticsOverview,
  getDashboardV2,
  getFinanceSummaryV2,
  getGoalsAnalyticsSummary,
  getRoutineLogs,
  getWeeklyReviewPreview,
  listSuggestions,
  listWeeklyReviews,
  sendChatMessage,
  updateWeeklyReview,
} from '../lib/api'
import { formatCurrency, formatDate, formatPercent, titleCase } from '../lib/formatters'

const ROUTINE_TOTAL = 20

const STATUS_COLORS: Record<string, string> = {
  active: '#2563eb', available: '#16a34a', blocked: '#dc2626',
  done: '#6b7280', deferred: '#9333ea',
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

type AnalyticsPageProps = {
  initialTab?: 'overview' | 'history' | 'patterns' | 'review'
  hideTabs?: boolean
}

export function AnalyticsPage({ initialTab = 'overview', hideTabs = false }: AnalyticsPageProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'overview' | 'history' | 'patterns' | 'review'>(initialTab)
  const overviewQuery = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: getAnalyticsOverview,
  })
  const reviewPreviewQuery = useQuery({
    queryKey: ['weekly-review-preview'],
    queryFn: getWeeklyReviewPreview,
  })
  const reviewsQuery = useQuery({
    queryKey: ['weekly-reviews'],
    queryFn: listWeeklyReviews,
  })
  const suggestionsQuery = useQuery({
    queryKey: ['suggestions'],
    queryFn: listSuggestions,
  })
  const goalsHealthQ = useQuery({
    queryKey: ['goals-analytics'],
    queryFn: getGoalsAnalyticsSummary,
  })

  async function invalidateReviewLoop() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['weekly-review-preview'] }),
      queryClient.invalidateQueries({ queryKey: ['weekly-reviews'] }),
      queryClient.invalidateQueries({ queryKey: ['suggestions'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['pipeline-workspace'] }),
    ])
  }

  const generateReviewMutation = useMutation({
    mutationFn: generateWeeklyReview,
    onSuccess: invalidateReviewLoop,
  })

  const saveNotesMutation = useMutation({
    mutationFn: ({ id, personalNotes }: { id: string; personalNotes: string }) =>
      updateWeeklyReview(id, { personal_notes: personalNotes }),
    onSuccess: invalidateReviewLoop,
  })

  const actSuggestionMutation = useMutation({
    mutationFn: actSuggestion,
    onSuccess: invalidateReviewLoop,
  })

  const dismissSuggestionMutation = useMutation({
    mutationFn: dismissSuggestion,
    onSuccess: invalidateReviewLoop,
  })

  // ── Supplementary data for new Overview panels ────────────────────────────
  const dashQuery = useQuery({ queryKey: ['dashboard-v2'], queryFn: getDashboardV2 })
  const financeQuery = useQuery({ queryKey: ['finance-summary-v2'], queryFn: getFinanceSummaryV2 })

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA')
  })
  const weekResults = useQueries({
    queries: weekDates.map(date => ({
      queryKey: ['routine-logs', date],
      queryFn: () => getRoutineLogs(date),
    })),
  })

  const [aiPatternAnalysis, setAiPatternAnalysis] = useState<string | null>(null)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const analyzePatternsMutation = useMutation({
    mutationFn: () =>
      sendChatMessage([
        {
          role: 'user',
          content:
            '[Context: Analytics patterns] Analyze my cross-domain patterns. Look at health, mood, finance, habits, and pipeline data. What correlations and trends do you see? What\'s working? What\'s a warning sign? Be specific, direct, and actionable.',
        },
      ]),
    onSuccess: (result) => {
      setAiPatternAnalysis(result.reply)
    },
  })

  if (
    overviewQuery.isLoading
    || reviewPreviewQuery.isLoading
    || reviewsQuery.isLoading
    || suggestionsQuery.isLoading
  ) {
    return <section className="loading-state">Loading analytics...</section>
  }

  if (
    overviewQuery.isError
    || reviewPreviewQuery.isError
    || reviewsQuery.isError
    || suggestionsQuery.isError
    || !overviewQuery.data
    || !reviewPreviewQuery.data
    || !reviewsQuery.data
    || !suggestionsQuery.data
  ) {
    return <section className="error-state">We could not load analytics right now.</section>
  }

  const overview = overviewQuery.data
  const counts = overview.counts
  const preview = generateReviewMutation.data?.preview ?? reviewPreviewQuery.data
  const currentReview =
    generateReviewMutation.data?.review
    ?? reviewsQuery.data.results.find(
      (review) => review.week_start === preview.week_start && review.week_end === preview.week_end,
    )
    ?? reviewsQuery.data.results[0]
    ?? null
  const pendingSuggestions = suggestionsQuery.data.results.filter(
    (suggestion) => !suggestion.acted_on && !suggestion.dismissed_at,
  )

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h2>Overview, history, patterns, and review</h2>
          <p>Keep the cross-domain picture legible and close the week inside the same workspace.</p>
        </div>
        {hideTabs ? null : (
          <div className="button-row">
            {[
              ['overview', 'Overview'],
              ['history', 'History'],
              ['patterns', 'Patterns'],
              ['review', 'Review'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={tab === value ? 'button-muted active' : 'button-muted'}
                type="button"
                onClick={() => setTab(value as typeof tab)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'overview' ? (
        <div className="stack">
          {/* ── 4 metric cards (real data) ── */}
          <div className="metric-grid">
            <MetricCard
              label="Independent income"
              value={formatCurrency(overview.finance.independent_income_eur)}
              hint={`${formatPercent(overview.finance.kyrgyzstan_progress_pct)} to Kyrgyzstan trigger`}
              tone="success"
            />
            <MetricCard label="Net this month" value={formatCurrency(overview.finance.net_eur)} />
            <MetricCard label="Sleep 7d" value={`${overview.health.avg_sleep_7d ?? 0} h`} />
            <MetricCard label="Prayer completion" value={formatPercent(overview.health.prayer_completion_rate_7d ?? 0)} />
          </div>

          {/* ── Panel A: Routine 7-day bar chart ── */}
          <Panel title="Routine — last 7 days" description="Blocks logged as done or partial out of 20 per day.">
            <div className="analytics-week-chart">
              {weekDates.map((date, i) => {
                const logs = weekResults[i].data || []
                const done = logs.filter(l => l.status === 'done' || l.status === 'partial').length
                const pct = Math.round((done / ROUTINE_TOTAL) * 100)
                const d = new Date(date + 'T00:00:00')
                const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short' })
                const dateLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                const isToday = date === new Date().toLocaleDateString('en-CA')
                const barColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : pct > 0 ? '#94a3b8' : '#e5e7eb'
                return (
                  <div key={date} className={`analytics-day-bar${isToday ? ' analytics-day-today' : ''}`}>
                    <span className="analytics-bar-pct">{pct > 0 ? `${pct}%` : '—'}</span>
                    <div className="analytics-bar-col">
                      <div className="analytics-bar-fill" style={{ height: `${Math.max(pct, 2)}%`, background: barColor }} />
                    </div>
                    <span className="analytics-bar-day">{dayLabel}</span>
                    <span className="analytics-bar-date">{dateLabel}</span>
                  </div>
                )
              })}
            </div>
          </Panel>

          <div className="two-column">
            {/* ── Panel B: Node breakdown by status ── */}
            <Panel title="Goals breakdown" description="Current node count by status.">
              {dashQuery.data ? (
                <table className="finance-debt-table" style={{ width: '100%' }}>
                  <tbody>
                    {(['active', 'available', 'blocked', 'done', 'deferred'] as const).map(status => {
                      const count = dashQuery.data.node_counts[status]
                      const pct = dashQuery.data.node_counts.total > 0
                        ? Math.round((count / dashQuery.data.node_counts.total) * 100) : 0
                      return (
                        <tr key={status}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status], flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ textTransform: 'capitalize' }}>{status}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 14, width: 36 }}>{count}</td>
                          <td style={{ width: 80, paddingLeft: 12 }}>
                            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: STATUS_COLORS[status], borderRadius: 99 }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="debt-total-row">
                      <td style={{ padding: '10px 0 0' }}>Total</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', padding: '10px 0 0' }}>{dashQuery.data.node_counts.total}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              ) : <p className="muted">Loading…</p>}
            </Panel>

            {/* ── Panel C: Finance snapshot ── */}
            <Panel title="Finance snapshot" description="Income progress and debt payoff trajectory." >
              {financeQuery.data ? (() => {
                const f = financeQuery.data
                const totalDebt = (f.debts || []).reduce((s, d) => s + d.amount_egp, 0)
                const surplusEgp = f.surplus_egp
                const debtFreeLabel = surplusEgp > 0 && totalDebt > 0
                  ? (() => {
                      const months = Math.ceil(totalDebt / surplusEgp)
                      const d = new Date(); d.setMonth(d.getMonth() + months)
                      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                    })()
                  : null
                return (
                  <div className="finance-summary-view">
                    <div className="finance-summary-row">
                      <span className="finance-summary-key">Independent income</span>
                      <span className="finance-summary-val">€{Math.round(Number(f.independent_monthly))}/mo</span>
                    </div>
                    <div className="finance-summary-row">
                      <span className="finance-summary-key">Target</span>
                      <span className="finance-summary-val">€{Math.round(Number(f.target_independent))}/mo</span>
                    </div>
                    <div className="finance-summary-row">
                      <span className="finance-summary-key">Monthly surplus</span>
                      <span className="finance-summary-val" style={{ color: surplusEgp >= 0 ? 'var(--success)' : '#dc2626' }}>
                        ~{fmtK(surplusEgp)} EGP
                      </span>
                    </div>
                    <div className="finance-summary-row">
                      <span className="finance-summary-key">Total debt</span>
                      <span className="finance-summary-val">{fmtK(totalDebt)} EGP</span>
                    </div>
                    {debtFreeLabel && (
                      <div className="finance-summary-row">
                        <span className="finance-summary-key">🎉 Debt-free by</span>
                        <span className="finance-summary-val" style={{ color: 'var(--accent-strong)', fontWeight: 700 }}>{debtFreeLabel}</span>
                      </div>
                    )}
                    {!debtFreeLabel && totalDebt === 0 && (
                      <p className="muted" style={{ marginTop: 8 }}>No debts recorded.</p>
                    )}
                  </div>
                )
              })() : <p className="muted">Loading…</p>}
            </Panel>
          </div>

          {/* ── Panel D: Goal health ── */}
          <Panel title="Goal health" description="Stalled goals, time investment, and monthly completions.">
            {goalsHealthQ.data ? (
              <div className="goals-analytics-body">
                {goalsHealthQ.data.stalled_goals.length > 0 && (
                  <>
                    <p className="goals-analytics-label">Stalled (&gt;14 days, no update)</p>
                    <ul className="goals-analytics-list">
                      {goalsHealthQ.data.stalled_goals.map(g => (
                        <li key={g.id} className="goals-analytics-item">
                          <span className="node-stalled-badge">stalled</span>
                          <span>{g.title}</span>
                          <span className="goals-analytics-meta">{g.category}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {goalsHealthQ.data.top_time_goals.length > 0 && (
                  <>
                    <p className="goals-analytics-label">Most time invested</p>
                    <ul className="goals-analytics-list">
                      {goalsHealthQ.data.top_time_goals.map(g => (
                        <li key={g.id} className="goals-analytics-item">
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)', fontSize: 12 }}>
                            {Math.floor(g.total_mins / 60) > 0 ? `${Math.floor(g.total_mins / 60)}h ` : ''}{g.total_mins % 60}m
                          </span>
                          <span>{g.title}</span>
                          <span className="goals-analytics-meta">{g.status}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="goals-analytics-label">
                  Completed this month: <strong>{goalsHealthQ.data.completed_this_month_count}</strong>
                </p>
              </div>
            ) : <p className="muted">Loading…</p>}
          </Panel>
        </div>
      ) : null}

      {tab === 'history' ? (
        <Panel title="Unified history" description="Chronological activity across health, money, work, and reflection.">
          {overview.history.length === 0 ? (
            <EmptyState title="No history yet" body="As logs and records are added, this feed will fill in." />
          ) : (
            <div className="record-list">
              {overview.history.map((item) => (
                <article key={`${item.domain}-${item.id}`} className="record-card">
                  <div className="record-card-header">
                    <div>
                      <h3>{item.title}</h3>
                      <div className="list-inline">
                        <span className="record-meta-chip">{item.domain}</span>
                        <span className="record-meta-chip">{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="muted">{item.detail || 'No extra detail recorded.'}</p>
                </article>
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {tab === 'patterns' ? (
        <div className="stack">
          <div className="two-column">
            <Panel title="Pattern analysis" description="Deterministic AI summary, kept structured rather than chatty.">
              <div className="callout">
                <p className="eyebrow">Pattern note</p>
                <h3>{overview.pattern_analysis}</h3>
              </div>
            </Panel>

            <Panel title="Freshness check" description="What the current read model is grounded in right now.">
              <ul className="plain-list">
                <li className="context-item">Analytics date: {formatDate(overview.date)}</li>
                <li className="context-item">History rows: {overview.history.length}</li>
                <li className="context-item">Marketing actions: {counts.marketing_actions}</li>
                <li className="context-item">Opportunities: {counts.opportunities ?? 0}</li>
                <li className="context-item">Health logs: {counts.health_logs ?? 0}</li>
              </ul>
            </Panel>
          </div>

          <Panel
            title="AI deep analysis"
            description="Claude reads all your logged data and surfaces honest cross-domain patterns."
            aside={
              <button
                disabled={analyzePatternsMutation.isPending}
                type="button"
                onClick={() => analyzePatternsMutation.mutate()}
              >
                {analyzePatternsMutation.isPending ? 'Analyzing...' : 'Analyze my patterns'}
              </button>
            }
          >
            {aiPatternAnalysis ? (
              <div className="callout">
                <p className="eyebrow">AI pattern analysis</p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{aiPatternAnalysis}</p>
              </div>
            ) : (
              <EmptyState
                title="No analysis yet"
                body="Click the button to let the AI surface honest cross-domain patterns from your data."
              />
            )}
          </Panel>
        </div>
      ) : null}

      {tab === 'review' ? (
        <div className="stack">
          <div className="two-column">
            <Panel
              title="Current weekly preview"
              description={`Week ${formatDate(preview.week_start)} to ${formatDate(preview.week_end)}`}
              aside={
                <button
                  disabled={generateReviewMutation.isPending}
                  type="button"
                  onClick={() => generateReviewMutation.mutate()}
                >
                  {generateReviewMutation.isPending ? 'Generating...' : 'Generate weekly review'}
                </button>
              }
            >
              <div className="callout">
                <p className="eyebrow">Preview</p>
                <h3>{preview.report.split('\n')[0]}</h3>
                <p>{preview.report.split('\n').slice(1).join(' ')}</p>
              </div>
              {generateReviewMutation.isError ? (
                <p className="error-text">We could not generate the weekly review.</p>
              ) : null}
            </Panel>

            <Panel
              title="Pending suggestions"
              description="Explicitly act on or dismiss the system nudges that are still unresolved."
              aside={`${pendingSuggestions.length} pending`}
            >
              {pendingSuggestions.length === 0 ? (
                <EmptyState
                  title="No pending suggestions"
                  body="The loop is quiet right now. New suggestions will appear after check-ins or weekly review generation."
                />
              ) : (
                <div className="record-list">
                  {pendingSuggestions.map((suggestion) => (
                    <article key={suggestion.id} className="record-card">
                      <div className="record-card-header">
                        <div>
                          <h3>{titleCase(suggestion.topic)}</h3>
                          <div className="list-inline">
                            <span className="record-meta-chip">{titleCase(suggestion.module)}</span>
                            <span className="record-meta-chip">{formatDate(suggestion.shown_at)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="muted">{suggestion.suggestion_text}</p>
                      <div className="button-row">
                        <button
                          disabled={actSuggestionMutation.isPending}
                          type="button"
                          onClick={() => actSuggestionMutation.mutate(suggestion.id)}
                        >
                          {actSuggestionMutation.isPending && actSuggestionMutation.variables === suggestion.id
                            ? 'Saving...'
                            : 'Acted on'}
                        </button>
                        <button
                          className="button-ghost"
                          disabled={dismissSuggestionMutation.isPending}
                          type="button"
                          onClick={() => dismissSuggestionMutation.mutate(suggestion.id)}
                        >
                          {dismissSuggestionMutation.isPending && dismissSuggestionMutation.variables === suggestion.id
                            ? 'Saving...'
                            : 'Dismiss'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="two-column">
            <Panel title="Latest saved review" description="Persisted weekly review with editable personal notes.">
              {currentReview ? (
                <div className="stack">
                  <div className="summary-strip">
                    <div>
                      <strong>{formatDate(currentReview.week_start)}</strong>
                      <p className="muted">Week start</p>
                    </div>
                    <div>
                      <strong>{formatDate(currentReview.week_end)}</strong>
                      <p className="muted">Week end</p>
                    </div>
                  </div>
                  <p>{currentReview.ai_report}</p>
                  <ReviewNotesForm
                    key={`${currentReview.id}-${currentReview.personal_notes}`}
                    initialValue={currentReview.personal_notes}
                    isSubmitting={saveNotesMutation.isPending}
                    onSubmit={(personalNotes) =>
                      saveNotesMutation.mutate({ id: currentReview.id, personalNotes })
                    }
                    onAutoSave={(personalNotes) =>
                      saveNotesMutation.mutate({ id: currentReview.id, personalNotes })
                    }
                  />
                  {saveNotesMutation.isError ? (
                    <p className="error-text">We could not save the review notes.</p>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="No saved review yet"
                  body="Generate the weekly review to persist it and start adding personal notes."
                />
              )}
            </Panel>

            <Panel title="Review history" description="Recent generated reviews, newest first.">
              {reviewsQuery.data.results.length === 0 ? (
                <EmptyState
                  title="No review history yet"
                  body="Once a review is generated, it will appear here for quick revisits."
                />
              ) : (
                <div className="record-list">
                  {reviewsQuery.data.results.slice(0, 5).map((review) => (
                    <article key={review.id} className="record-card">
                      <div className="record-card-header">
                        <div>
                          <h3>{formatDate(review.week_start)} to {formatDate(review.week_end)}</h3>
                          <div className="list-inline">
                            <span className="record-meta-chip">{formatDate(review.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="muted">{review.personal_notes || review.ai_report}</p>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      ) : null}
    </section>
  )
}
