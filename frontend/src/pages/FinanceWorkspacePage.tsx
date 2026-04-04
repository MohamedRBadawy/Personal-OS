import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import { WorkspaceTabs } from '../components/WorkspaceTabs'
import {
  createIncomeSource,
  deleteIncomeSource,
  getFinancialReport,
  getFinanceOverview,
  getPersonalReviewReport,
  getProgressReport,
  updateIncomeSource,
} from '../lib/api'
import { formatCurrency, formatPercent } from '../lib/formatters'
import { FinancePage as LedgerFinancePage } from './FinancePage'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'income', label: 'Income Sources' },
  { id: 'reports', label: 'Reports' },
] as const

export function FinanceWorkspacePage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = tabs.some((tab) => tab.id === searchParams.get('tab'))
    ? (searchParams.get('tab') as (typeof tabs)[number]['id'])
    : 'overview'

  const overviewQuery = useQuery({
    queryKey: ['finance-overview'],
    queryFn: getFinanceOverview,
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Freelance')
  const [monthlyTarget, setMonthlyTarget] = useState('0')
  const [baselineAmount, setBaselineAmount] = useState('')
  const [active, setActive] = useState(true)
  const [notes, setNotes] = useState('')
  const [activeReport, setActiveReport] = useState<'financial' | 'progress' | 'personal-review'>('financial')

  const reportQueries = {
    financial: useQuery({
      queryKey: ['report', 'financial'],
      queryFn: getFinancialReport,
      enabled: activeTab === 'reports' && activeReport === 'financial',
    }),
    progress: useQuery({
      queryKey: ['report', 'progress'],
      queryFn: getProgressReport,
      enabled: activeTab === 'reports' && activeReport === 'progress',
    }),
    'personal-review': useQuery({
      queryKey: ['report', 'personal-review'],
      queryFn: getPersonalReviewReport,
      enabled: activeTab === 'reports' && activeReport === 'personal-review',
    }),
  }

  const currentReport = reportQueries[activeReport]

  const saveSourceMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        category,
        monthly_target_eur: monthlyTarget,
        baseline_amount_eur: baselineAmount || null,
        active,
        notes,
      }
      return editingId ? updateIncomeSource(editingId, payload) : createIncomeSource(payload)
    },
    onSuccess: async () => {
      setEditingId(null)
      setName('')
      setCategory('Freelance')
      setMonthlyTarget('0')
      setBaselineAmount('')
      setActive(true)
      setNotes('')
      await queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
    },
  })

  const deleteSourceMutation = useMutation({
    mutationFn: deleteIncomeSource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
    },
  })

  const sortedSources = useMemo(
    () => overviewQuery.data?.income_sources ?? [],
    [overviewQuery.data],
  )

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Finance</p>
          <h2>See money clearly, track income streams, and generate reports.</h2>
          <p>The finance view now groups the ledger, income sources, target tracking, and named reporting in one place.</p>
        </div>
        <WorkspaceTabs
          activeTab={activeTab}
          tabs={tabs as unknown as Array<{ id: string; label: string }>}
          onChange={(tab) => setSearchParams(tab === 'overview' ? {} : { tab })}
        />
      </div>

      {overviewQuery.isLoading ? <section className="loading-state">Loading finance workspace...</section> : null}
      {overviewQuery.isError || !overviewQuery.data ? (
        <section className="error-state">We could not load the finance workspace.</section>
      ) : null}

      {overviewQuery.data && activeTab === 'overview' ? (
        <div className="stack">
          <div className="metric-grid">
            <MetricCard label="Income" value={formatCurrency(overviewQuery.data.summary.total_income_eur)} />
            <MetricCard label="Expenses" value={formatCurrency(overviewQuery.data.summary.total_expense_eur)} />
            <MetricCard label="Independent income" value={formatCurrency(overviewQuery.data.summary.independent_income_eur)} tone="success" />
            <MetricCard label="Progress" value={formatPercent(overviewQuery.data.target_tracking.progress_pct)} />
            <MetricCard label="Months to target" value={`${overviewQuery.data.target_tracking.months_to_target ?? '-'}`} />
            <MetricCard label="Income sources" value={`${overviewQuery.data.target_tracking.active_income_sources}`} />
          </div>

          <div className="two-column">
            <Panel title="Monthly picture" description="Target tracking is no longer hidden behind the raw ledger.">
              <div className="summary-strip">
                <div>
                  <strong>{overviewQuery.data.monthly_summary.income_entry_count}</strong>
                  <p className="muted">Income entries</p>
                </div>
                <div>
                  <strong>{overviewQuery.data.monthly_summary.expense_entry_count}</strong>
                  <p className="muted">Expense entries</p>
                </div>
                <div>
                  <strong>{formatCurrency(overviewQuery.data.monthly_summary.recurring_income_eur)}</strong>
                  <p className="muted">Recurring income</p>
                </div>
                <div>
                  <strong>{formatCurrency(overviewQuery.data.monthly_summary.recurring_expense_eur)}</strong>
                  <p className="muted">Recurring expense</p>
                </div>
              </div>
            </Panel>

            <Panel title="Top income sources" description="Named sources make the income story easier to reason about.">
              {sortedSources.length === 0 ? (
                <EmptyState title="No income sources yet" body="Add named streams in the income tab." />
              ) : (
                <div className="record-list">
                  {sortedSources.slice(0, 4).map((source) => (
                    <article key={source.id} className="record-card">
                      <div className="record-card-header">
                        <div>
                          <h3>{source.name}</h3>
                          <div className="list-inline">
                            <span className="record-meta-chip">{source.category || 'Uncategorized'}</span>
                            <span className="record-meta-chip">{source.active ? 'Active' : 'Paused'}</span>
                          </div>
                        </div>
                        <strong>{formatPercent(source.progress_pct)}</strong>
                      </div>
                      <p className="muted">
                        {formatCurrency(source.realized_this_month_eur)} realized against {formatCurrency(source.monthly_target_eur)} target.
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      {overviewQuery.data && activeTab === 'income' ? (
        <div className="two-column">
          <Panel
            title={editingId ? 'Edit income source' : 'Add income source'}
            description="Track strategic income streams separately from individual transactions."
            aside={editingId ? (
              <button className="button-ghost" type="button" onClick={() => {
                setEditingId(null)
                setName('')
                setCategory('Freelance')
                setMonthlyTarget('0')
                setBaselineAmount('')
                setActive(true)
                setNotes('')
              }}>
                Cancel edit
              </button>
            ) : null}
          >
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault()
                saveSourceMutation.mutate()
              }}
            >
              <div className="field span-2">
                <label htmlFor="income-source-name">Name</label>
                <input id="income-source-name" required value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="income-source-category">Category</label>
                <input id="income-source-category" value={category} onChange={(event) => setCategory(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="income-source-target">Monthly target (EUR)</label>
                <input id="income-source-target" min="0" step="0.01" type="number" value={monthlyTarget} onChange={(event) => setMonthlyTarget(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="income-source-baseline">Baseline (EUR)</label>
                <input id="income-source-baseline" min="0" step="0.01" type="number" value={baselineAmount} onChange={(event) => setBaselineAmount(event.target.value)} />
              </div>
              <div className="field span-2 checkbox-row">
                <input checked={active} id="income-source-active" type="checkbox" onChange={(event) => setActive(event.target.checked)} />
                <label htmlFor="income-source-active">Active source</label>
              </div>
              <div className="field span-2">
                <label htmlFor="income-source-notes">Notes</label>
                <textarea id="income-source-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
              <div className="field span-2 form-actions">
                <button disabled={saveSourceMutation.isPending} type="submit">
                  {saveSourceMutation.isPending ? 'Saving source...' : editingId ? 'Update income source' : 'Add income source'}
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Current income sources" description="Edit, pause, or remove sources as the strategy changes.">
            {sortedSources.length === 0 ? (
              <EmptyState title="No income sources" body="Add your first named stream to make revenue planning clearer." />
            ) : (
              <div className="record-list">
                {sortedSources.map((source) => (
                  <article key={source.id} className="record-card">
                    <div className="record-card-header">
                      <div>
                        <h3>{source.name}</h3>
                        <div className="list-inline">
                          <span className="record-meta-chip">{source.category || 'Uncategorized'}</span>
                          <span className="record-meta-chip">{source.active ? 'Active' : 'Paused'}</span>
                        </div>
                      </div>
                      <div className="button-row">
                        <button className="button-muted" type="button" onClick={() => {
                          setEditingId(source.id)
                          setName(source.name)
                          setCategory(source.category)
                          setMonthlyTarget(source.monthly_target_eur)
                          setBaselineAmount(source.baseline_amount_eur ?? '')
                          setActive(source.active)
                          setNotes(source.notes)
                        }}>
                          Edit
                        </button>
                        <button className="button-ghost" disabled={deleteSourceMutation.isPending} type="button" onClick={() => deleteSourceMutation.mutate(source.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="muted">
                      {formatCurrency(source.realized_this_month_eur)} realized this month against a {formatCurrency(source.monthly_target_eur)} target.
                    </p>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'reports' ? (
        <div className="stack">
          <WorkspaceTabs
            activeTab={activeReport}
            tabs={[
              { id: 'financial', label: 'Financial' },
              { id: 'progress', label: 'Progress' },
              { id: 'personal-review', label: 'Personal Review' },
            ]}
            onChange={(tab) => setActiveReport(tab as typeof activeReport)}
          />
          <Panel title="Named report" description="Generate focused reports without leaving the app.">
            {currentReport.isLoading ? (
              <section className="loading-state">Generating report...</section>
            ) : currentReport.isError || !currentReport.data ? (
              <section className="error-state">We could not load that report.</section>
            ) : (
              <div className="stack">
                <div className="summary-strip">
                  <div>
                    <strong>{currentReport.data.name}</strong>
                    <p className="muted">Report type</p>
                  </div>
                  <div>
                    <strong>{new Date(currentReport.data.generated_at).toLocaleString()}</strong>
                    <p className="muted">Generated at</p>
                  </div>
                </div>
                <pre className="report-block">{currentReport.data.report}</pre>
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {activeTab === 'ledger' ? <LedgerFinancePage /> : null}
    </section>
  )
}
