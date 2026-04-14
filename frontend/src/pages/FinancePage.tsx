import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FinanceEntryForm } from '../components/FinanceEntryForm'
import { MetricCard } from '../components/MetricCard'
import { Panel } from '../components/Panel'
import {
  createFinanceEntry,
  createIncomeEvent,
  deleteFinanceEntry,
  deleteIncomeEvent,
  exportFinanceCSV,
  getCategoryBreakdown,
  getFinanceSummary,
  getMonthlyChart,
  listFinanceEntries,
  listIncomeEvents,
  updateFinanceEntry,
} from '../lib/api'
import { formatCurrency } from '../lib/formatters'
import type { FinanceEntry, FinanceEntryPayload, IncomeEvent } from '../lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  housing: 'Housing',
  transport: 'Transport',
  utilities: 'Utilities',
  education: 'Education',
  children: 'Children',
  health: 'Health',
  debt_payment: 'Debt Payment',
  business: 'Business',
  savings: 'Savings',
  other: 'Other',
  income_employment: 'Employment',
  income_independent: 'Independent',
  income_other: 'Other Income',
}

// ── Monthly Bar Chart ─────────────────────────────────────────────────────────

function MonthlyBarChart() {
  const { data = [] } = useQuery({
    queryKey: ['finance-monthly-chart'],
    queryFn: getMonthlyChart,
  })

  if (!data.length) return null

  const maxVal = Math.max(...data.flatMap((p) => [p.income_eur, p.expense_eur, 1]))

  return (
    <div className="monthly-chart-section">
      <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>6-Month Overview</h3>
      <div className="monthly-chart-bars">
        {data.map((point) => {
          const incH = Math.round((point.income_eur / maxVal) * 120)
          const expH = Math.round((point.expense_eur / maxVal) * 120)
          const indH = Math.round((point.independent_eur / maxVal) * 120)
          return (
            <div key={point.month} className="monthly-chart-group">
              <div className="monthly-chart-bars-row">
                <div
                  className="monthly-chart-bar income"
                  style={{ height: `${Math.max(2, incH)}px` }}
                  title={`Income: €${Math.round(point.income_eur)}`}
                />
                <div
                  className="monthly-chart-bar expense"
                  style={{ height: `${Math.max(2, expH)}px` }}
                  title={`Expenses: €${Math.round(point.expense_eur)}`}
                />
                <div
                  className="monthly-chart-bar independent"
                  style={{ height: `${Math.max(2, indH)}px` }}
                  title={`Independent: €${Math.round(point.independent_eur)}`}
                />
              </div>
              <span className="monthly-chart-label">{point.label}</span>
            </div>
          )
        })}
      </div>
      <div className="monthly-chart-legend">
        <div className="monthly-chart-legend-item">
          <div className="monthly-chart-legend-dot" style={{ background: '#22c55e' }} />
          Income
        </div>
        <div className="monthly-chart-legend-item">
          <div className="monthly-chart-legend-dot" style={{ background: '#ef4444' }} />
          Expenses
        </div>
        <div className="monthly-chart-legend-item">
          <div className="monthly-chart-legend-dot" style={{ background: '#3b82f6' }} />
          Independent
        </div>
      </div>
    </div>
  )
}

// ── Category Breakdown ────────────────────────────────────────────────────────

function CategoryBreakdown({ month }: { month: string }) {
  const { data = [] } = useQuery({
    queryKey: ['finance-category-breakdown', month],
    queryFn: () => getCategoryBreakdown(month),
  })

  const expenses = data.filter((d) => !d.category.startsWith('income_'))
  if (!expenses.length) return null

  const maxEgp = Math.max(...expenses.map((d) => d.total_egp), 1)

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>
        Expenses by Category — {fmtMonth(month)}
      </h3>
      <div className="cat-breakdown-list">
        {expenses.map((item) => {
          const pct = Math.round((item.total_egp / maxEgp) * 100)
          return (
            <div key={item.category} className="cat-breakdown-item">
              <div className="cat-breakdown-header">
                <span>{item.label || CATEGORY_LABELS[item.category] || item.category}</span>
                <span style={{ color: 'var(--muted)' }}>
                  {Math.round(item.total_egp).toLocaleString()} EGP
                  {item.total_eur > 0 && ` / €${Math.round(item.total_eur)}`}
                </span>
              </div>
              <div className="cat-breakdown-bar-track">
                <div className="cat-breakdown-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Entry Row (view + inline edit) ───────────────────────────────────────────

function EntryRow({
  entry,
  editingId,
  editForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditFormChange,
}: {
  entry: FinanceEntry
  editingId: number | null
  editForm: Partial<FinanceEntryPayload>
  onStartEdit: (entry: FinanceEntry) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: (id: number) => void
  onEditFormChange: (patch: Partial<FinanceEntryPayload>) => void
}) {
  const id = Number(entry.id)
  if (editingId === id) {
    return (
      <tr className="entry-edit-row">
        <td colSpan={7}>
          <div className="entry-edit-inputs">
            <input
              type="date"
              value={editForm.date ?? entry.date}
              onChange={(e) => onEditFormChange({ date: e.target.value })}
            />
            <input
              placeholder="Source"
              value={editForm.source ?? entry.source}
              onChange={(e) => onEditFormChange({ source: e.target.value })}
            />
            <select
              value={editForm.type ?? entry.type}
              onChange={(e) => onEditFormChange({ type: e.target.value as 'income' | 'expense' })}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select
              value={editForm.currency ?? entry.currency}
              onChange={(e) => onEditFormChange({ currency: e.target.value as 'EUR' | 'USD' | 'EGP' })}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="EGP">EGP</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount"
              value={editForm.amount ?? entry.amount}
              onChange={(e) => onEditFormChange({ amount: e.target.value })}
            />
            <button className="btn-primary" style={{ padding: '4px 12px', fontSize: 14 }} onClick={onSaveEdit}>
              Save
            </button>
            <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 14 }} onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td style={{ fontSize: 14, color: 'var(--text-muted)' }}>{entry.date}</td>
      <td>{entry.source}</td>
      <td style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        {CATEGORY_LABELS[entry.category] || entry.category || '—'}
      </td>
      <td>
        <span
          style={{
            fontSize: 13,
            padding: '2px 6px',
            borderRadius: 4,
            background: entry.type === 'income' ? '#dcfce7' : '#fee2e2',
            color: entry.type === 'income' ? '#16a34a' : '#dc2626',
          }}
        >
          {entry.type}
        </span>
      </td>
      <td style={{ fontSize: 14 }}>{entry.currency}</td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(entry.amount_eur)}</td>
      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--text-muted)' }}>
        {entry.amount_egp.toLocaleString()} EGP
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button
          className="table-action-btn"
          title="Edit"
          onClick={() => onStartEdit(entry)}
        >
          ✏️
        </button>
        <button
          className="table-action-btn danger"
          title="Delete"
          onClick={() => onDelete(id)}
        >
          🗑️
        </button>
      </td>
    </tr>
  )
}

// ── Income Events ─────────────────────────────────────────────────────────────

function IncomeEventsPanel() {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ date: today, source: '', amount_eur: '', notes: '' })
  const [adding, setAdding] = useState(false)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['income-events'],
    queryFn: listIncomeEvents,
  })

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: getFinanceSummary,
  })

  const createMut = useMutation({
    mutationFn: (e: Omit<IncomeEvent, 'id' | 'created_at'>) => createIncomeEvent(e),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-events'] })
      setForm({ date: today, source: '', amount_eur: '', notes: '' })
      setAdding(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteIncomeEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income-events'] }),
  })

  const totalEur = events.reduce((sum, e) => sum + Number(e.amount_eur), 0)
  const targetEur = (summary as any)?.target_independent ?? 1000

  function handleSubmit() {
    if (!form.source.trim() || !form.date) return
    createMut.mutate({
      date: form.date,
      source: form.source.trim(),
      amount_eur: Number(form.amount_eur) || 0,
      notes: form.notes.trim(),
    })
  }

  return (
    <Panel
      title="Income milestones"
      description="Key income events — first clients, deals closed, salary raises."
    >
      {/* Progress toward target */}
      <div className="income-events-progress">
        <div className="income-events-progress-label">
          <span>Total logged: <strong>{formatCurrency(totalEur)}</strong></span>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Target: {formatCurrency(targetEur)}/mo
          </span>
        </div>
        <div className="income-events-bar-track">
          <div
            className="income-events-bar-fill"
            style={{ width: `${Math.min(100, Math.round((totalEur / targetEur) * 100))}%` }}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      ) : events.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No income events logged yet.</p>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th style={{ textAlign: 'right' }}>Amount (EUR)</th>
                <th>Notes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ fontSize: 14, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ev.date}</td>
                  <td style={{ fontWeight: 500 }}>{ev.source}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 14 }}>
                    {Number(ev.amount_eur) > 0 ? formatCurrency(Number(ev.amount_eur)) : '—'}
                  </td>
                  <td style={{ fontSize: 14, color: 'var(--text-muted)' }}>{ev.notes || '—'}</td>
                  <td>
                    <button
                      className="table-action-btn danger"
                      title="Delete"
                      onClick={() => {
                        if (window.confirm('Delete this income event?')) deleteMut.mutate(Number(ev.id))
                      }}
                    >🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add event */}
      {adding ? (
        <div className="income-log-form">
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
          />
          <input
            placeholder="Source (client, deal, raise…)"
            value={form.source}
            onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount EUR (0 for non-monetary)"
            value={form.amount_eur}
            onChange={(e) => setForm(f => ({ ...f, amount_eur: e.target.value }))}
          />
          <input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-primary"
              style={{ padding: '6px 16px', fontSize: 14 }}
              disabled={createMut.isPending || !form.source.trim()}
              onClick={handleSubmit}
            >
              {createMut.isPending ? 'Logging…' : 'Log event'}
            </button>
            <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 14 }} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost-sm" onClick={() => setAdding(true)}>+ Log income event</button>
      )}
    </Panel>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function FinancePage() {
  const queryClient = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth)
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<FinanceEntryPayload>>({})

  const summaryQuery = useQuery({
    queryKey: ['finance-summary'],
    queryFn: getFinanceSummary,
  })

  const entriesQuery = useQuery({
    queryKey: ['finance-entries', selectedMonth, typeFilter],
    queryFn: () =>
      listFinanceEntries({
        month: selectedMonth,
        type: typeFilter === 'all' ? undefined : typeFilter,
      }),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance-entries', selectedMonth, typeFilter] })
    queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['command-center'] })
  }

  const createEntryMutation = useMutation({
    mutationFn: (payload: FinanceEntryPayload) => createFinanceEntry(payload),
    onSuccess: invalidate,
  })

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<FinanceEntryPayload> }) =>
      updateFinanceEntry(id, payload),
    onSuccess: () => {
      setEditingId(null)
      setEditForm({})
      invalidate()
    },
  })

  const deleteEntryMutation = useMutation({
    mutationFn: (id: number) => deleteFinanceEntry(id),
    onSuccess: invalidate,
  })

  function handleStartEdit(entry: FinanceEntry) {
    setEditingId(Number(entry.id))
    setEditForm({
      date: entry.date,
      source: entry.source,
      type: entry.type,
      currency: entry.currency,
      amount: entry.amount,
      category: entry.category,
    })
  }

  function handleSaveEdit() {
    if (editingId === null) return
    updateEntryMutation.mutate({ id: editingId, payload: editForm })
  }

  function handleDelete(id: number) {
    if (!window.confirm('Delete this entry?')) return
    deleteEntryMutation.mutate(id)
  }

  const isLoading = summaryQuery.isLoading || entriesQuery.isLoading
  const isError = summaryQuery.isError || entriesQuery.isError

  return (
    <section className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="eyebrow">Finance</p>
          <h2>Money movement and independence progress</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Month navigator */}
          <div className="month-nav">
            <button className="month-nav-btn" onClick={() => setSelectedMonth((m) => addMonths(m, -1))}>
              ←
            </button>
            <span className="month-nav-label">{fmtMonth(selectedMonth)}</span>
            <button className="month-nav-btn" onClick={() => setSelectedMonth((m) => addMonths(m, 1))}>
              →
            </button>
          </div>
          {/* Type filter tabs */}
          <div className="finance-type-tabs">
            {(['all', 'income', 'expense'] as const).map((tab) => (
              <button
                key={tab}
                className={`finance-type-tab${typeFilter === tab ? ' active' : ''}`}
                onClick={() => setTypeFilter(tab)}
              >
                {tab === 'all' ? 'All' : tab === 'income' ? 'Income' : 'Expenses'}
              </button>
            ))}
          </div>
          {/* Export CSV */}
          <a
            className="btn-ghost-sm"
            href={exportFinanceCSV(selectedMonth)}
            target="_blank"
            rel="noreferrer"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Summary cards */}
      {summaryQuery.data && (
        <div className="metric-grid">
          <MetricCard label="Income" value={formatCurrency(summaryQuery.data.total_income_eur)} />
          <MetricCard label="Expenses" value={formatCurrency(summaryQuery.data.total_expense_eur)} />
          <MetricCard
            label="Independent income"
            value={formatCurrency(summaryQuery.data.independent_income_eur)}
            tone="success"
          />
          <MetricCard
            label="Months to target"
            value={`${summaryQuery.data.months_to_target ?? '-'}`}
            hint="Based on the 3-month rolling average"
            tone="warning"
          />
        </div>
      )}

      {isLoading && <section className="loading-state">Loading finance view...</section>}
      {isError && <section className="error-state">Could not load finance data.</section>}

      {!isLoading && !isError && (
        <>
          {/* Two-column: form + entries table */}
          <div className="two-column">
            <Panel title="Add a finance entry" description="A fast way to log income or expenses.">
              <FinanceEntryForm
                isSubmitting={createEntryMutation.isPending}
                onSubmit={(payload) => createEntryMutation.mutate(payload)}
              />
            </Panel>

            <Panel title="Recent entries" description={`Entries for ${fmtMonth(selectedMonth)}.`}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Currency</th>
                      <th>Amount (EUR)</th>
                      <th>In EGP</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(entriesQuery.data?.results ?? []).map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        editingId={editingId}
                        editForm={editForm}
                        onStartEdit={handleStartEdit}
                        onCancelEdit={() => { setEditingId(null); setEditForm({}) }}
                        onSaveEdit={handleSaveEdit}
                        onDelete={handleDelete}
                        onEditFormChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
                      />
                    ))}
                    {(entriesQuery.data?.results ?? []).length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                          No entries for this period. Use the form above to log income or expenses.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* 6-month bar chart */}
          <MonthlyBarChart />

          {/* Category breakdown */}
          <CategoryBreakdown month={selectedMonth} />

          {/* Income milestone events */}
          <IncomeEventsPanel />
        </>
      )}
    </section>
  )
}
