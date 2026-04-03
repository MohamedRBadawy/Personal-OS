import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { ReviewNotesForm } from '../components/ReviewNotesForm'
import {
  actSuggestion,
  dismissSuggestion,
  generateWeeklyReview,
  getAnalyticsOverview,
  getWeeklyReviewPreview,
  listSuggestions,
  listWeeklyReviews,
  updateWeeklyReview,
} from '../lib/api'
import { formatCurrency, formatDate, formatPercent, titleCase } from '../lib/formatters'

export function AnalyticsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'overview' | 'history' | 'patterns' | 'review'>('overview')
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
      </div>

      {tab === 'overview' ? (
        <div className="stack">
          <div className="metric-grid">
            <MetricCard
              label="Independent income"
              value={formatCurrency(overview.finance.independent_income_eur)}
              hint={`${formatPercent(overview.finance.kyrgyzstan_progress_pct)} to relocation trigger`}
              tone="success"
            />
            <MetricCard label="Net this month" value={formatCurrency(overview.finance.net_eur)} />
            <MetricCard
              label="Sleep 7d"
              value={`${overview.health.avg_sleep_7d ?? 0} h`}
              hint={overview.health.low_energy_today ? 'Low energy flagged today' : 'Energy steady today'}
            />
            <MetricCard
              label="Prayer completion"
              value={formatPercent(overview.health.prayer_completion_rate_7d ?? 0)}
            />
          </div>

          <div className="two-column">
            <Panel title="Cross-domain counts" description="The current size of the system outside the core surfaces.">
              <div className="summary-strip">
                <div>
                  <strong>{counts.ideas}</strong>
                  <p className="muted">Ideas</p>
                </div>
                <div>
                  <strong>{counts.decisions}</strong>
                  <p className="muted">Decisions</p>
                </div>
                <div>
                  <strong>{counts.achievements}</strong>
                  <p className="muted">Achievements</p>
                </div>
                <div>
                  <strong>{counts.family_goals}</strong>
                  <p className="muted">Family goals</p>
                </div>
                <div>
                  <strong>{counts.relationships}</strong>
                  <p className="muted">Relationships</p>
                </div>
                <div>
                  <strong>{counts.learning_items ?? counts.learnings ?? 0}</strong>
                  <p className="muted">Learning items</p>
                </div>
              </div>
            </Panel>

            <Panel title="Pipeline pressure" description="What is still open in work and visibility.">
              <div className="summary-strip">
                <div>
                  <strong>{overview.pipeline.new_or_reviewing_count}</strong>
                  <p className="muted">New / reviewing</p>
                </div>
                <div>
                  <strong>{overview.pipeline.applied_count}</strong>
                  <p className="muted">Applied</p>
                </div>
                <div>
                  <strong>{overview.pipeline.won_count}</strong>
                  <p className="muted">Won</p>
                </div>
                <div>
                  <strong>{overview.pipeline.due_follow_ups_count}</strong>
                  <p className="muted">Due follow-ups</p>
                </div>
              </div>
            </Panel>
          </div>
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
