import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import {
  getFinanceSummaryV2, updateFinanceSummaryV2,
  listIncomeEvents, createIncomeEvent, deleteIncomeEvent,
  getExchangeRates, updateExchangeRates,
} from '../lib/api'
import type { ExchangeRates, FinanceSummaryV2, IncomeEvent } from '../lib/types'

type Debt = { name: string; amount_egp: number }

function fmtEur(n: number | string): string {
  return Math.round(Number(n)).toLocaleString('en-GB')
}

function formatK(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

// ── Monthly Budget Bar ─────────────────────────────────────────────────────

function MonthlyBudgetBar({ budget, expenses }: { budget: number | null; expenses: number }) {
  if (!budget || budget <= 0) return null
  const pct = Math.min(100, Math.round((expenses / budget) * 100))
  const isOver = expenses > budget
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - today.getDate()
  const barColor = isOver ? '#dc2626' : pct > 80 ? '#f59e0b' : 'var(--accent)'

  return (
    <div className="budget-bar-wrapper">
      <div className="budget-bar-header">
        <span className="budget-bar-label">Monthly budget</span>
        <span className="budget-bar-amounts">
          <span style={{ color: isOver ? '#dc2626' : 'var(--text)', fontWeight: 600 }}>
            {Math.round(expenses).toLocaleString()} EGP
          </span>
          {' / '}
          <span>{Math.round(budget).toLocaleString()} EGP</span>
          {isOver && <span className="budget-over-badge">over</span>}
        </span>
      </div>
      <div className="budget-bar">
        <div className="budget-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="budget-bar-footer">
        <span className="budget-bar-pct">{pct}% used</span>
        <span className="budget-bar-days">{daysLeft} days remaining this month</span>
      </div>
    </div>
  )
}

// ── Monthly Summary Edit Form ──────────────────────────────────────────────

function EditForm({ data, onSaved, onCancel }: { data: FinanceSummaryV2; onSaved: () => void; onCancel: () => void }) {
  const [incomeEur, setIncomeEur] = useState(String(data.income_eur))
  const [incomeEgpDirect, setIncomeEgpDirect] = useState(String(data.income_egp_direct || 0))
  const [incomeSources, setIncomeSources] = useState(data.income_sources_text)
  const [independentMonthly, setIndependentMonthly] = useState(String(data.independent_monthly))
  const [monthlyExpenses, setMonthlyExpenses] = useState(String(data.monthly_expenses_egp))
  const [exchangeRate, setExchangeRate] = useState(String(data.exchange_rate ?? 60))
  const [savingsTarget, setSavingsTarget] = useState(String(data.savings_target_egp ?? 0))
  const [savingsCurrent, setSavingsCurrent] = useState(String(data.savings_current_egp ?? 0))
  const [notes, setNotes] = useState(data.notes)
  const [monthlyBudget, setMonthlyBudget] = useState(String(data.monthly_budget_egp ?? ''))

  const mut = useMutation({
    mutationFn: (payload: Partial<FinanceSummaryV2>) => updateFinanceSummaryV2(payload),
    onSuccess: onSaved,
  })

  return (
    <div className="finance-edit-form">
      <div className="sp-row">
        <div className="sp-field">
          <label className="sp-label">Income (€/mo)</label>
          <input className="form-input" type="number" value={incomeEur} onChange={e => setIncomeEur(e.target.value)} />
        </div>
        <div className="sp-field">
          <label className="sp-label">Independent income (€/mo)</label>
          <input className="form-input" type="number" value={independentMonthly} onChange={e => setIndependentMonthly(e.target.value)} />
        </div>
      </div>
      <div className="sp-field">
        <label className="sp-label">Direct EGP income (EGP/mo)</label>
        <input className="form-input" type="number" value={incomeEgpDirect} onChange={e => setIncomeEgpDirect(e.target.value)}
          placeholder="Local salary, freelance, etc." />
      </div>
      <div className="sp-field">
        <label className="sp-label">Income sources</label>
        <input className="form-input" value={incomeSources} onChange={e => setIncomeSources(e.target.value)} />
      </div>
      <div className="sp-row">
        <div className="sp-field">
          <label className="sp-label">Monthly expenses (EGP)</label>
          <input className="form-input" type="number" value={monthlyExpenses} onChange={e => setMonthlyExpenses(e.target.value)} />
        </div>
        <div className="sp-field">
          <label className="sp-label">EGP/EUR rate</label>
          <input className="form-input" type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} placeholder="60" />
        </div>
      </div>
      <div className="sp-row">
        <div className="sp-field">
          <label className="sp-label">Savings target (EGP)</label>
          <input className="form-input" type="number" value={savingsTarget} placeholder="0"
            onChange={e => setSavingsTarget(e.target.value)} />
        </div>
        <div className="sp-field">
          <label className="sp-label">Savings current (EGP)</label>
          <input className="form-input" type="number" value={savingsCurrent} placeholder="0"
            onChange={e => setSavingsCurrent(e.target.value)} />
        </div>
      </div>
      <div className="sp-field">
        <label className="sp-label">Monthly budget (EGP) — optional</label>
        <input className="form-input" type="number" value={monthlyBudget} placeholder="e.g. 15000"
          onChange={e => setMonthlyBudget(e.target.value)} />
      </div>
      <div className="sp-field">
        <label className="sp-label">Notes</label>
        <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={mut.isPending}
          onClick={() => mut.mutate({
            income_eur: parseFloat(incomeEur),
            income_egp_direct: parseFloat(incomeEgpDirect) || 0,
            income_sources_text: incomeSources,
            independent_monthly: parseFloat(independentMonthly),
            monthly_expenses_egp: parseFloat(monthlyExpenses),
            exchange_rate: parseFloat(exchangeRate) || 60,
            savings_target_egp: parseFloat(savingsTarget) || 0,
            savings_current_egp: parseFloat(savingsCurrent) || 0,
            monthly_budget_egp: monthlyBudget ? parseFloat(monthlyBudget) : null,
            notes,
          })}>
          {mut.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Debt Edit Form (with drag reorder) ────────────────────────────────────

function DebtEditForm({ debts, onSaved, onCancel }: { debts: Debt[]; onSaved: () => void; onCancel: () => void }) {
  const [items, setItems] = useState<Debt[]>(debts.map(d => ({ ...d })))
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const mut = useMutation({
    mutationFn: (payload: Partial<FinanceSummaryV2>) => updateFinanceSummaryV2(payload),
    onSuccess: onSaved,
  })

  function updateItem(i: number, field: keyof Debt, value: string) {
    setItems(prev => prev.map((d, idx) =>
      idx === i ? { ...d, [field]: field === 'amount_egp' ? parseFloat(value) || 0 : value } : d
    ))
  }

  function onDragStart(idx: number) { setDragIdx(idx) }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setItems(prev => {
      const next = [...prev]
      const [dragged] = next.splice(dragIdx, 1)
      next.splice(idx, 0, dragged)
      return next
    })
    setDragIdx(idx)
  }
  function onDragEnd() { setDragIdx(null) }

  return (
    <div className="finance-edit-form">
      <div className="debt-edit-list">
        {items.map((debt, i) => (
          <div
            key={i}
            className={`debt-edit-row ${dragIdx === i ? 'dragging' : ''}`}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDragEnd={onDragEnd}
          >
            <span className="routine-edit-drag" style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: 14 }}>⠿</span>
            <input
              className="form-input"
              placeholder="Debt name"
              value={debt.name}
              onChange={e => updateItem(i, 'name', e.target.value)}
            />
            <input
              className="form-input"
              type="number"
              placeholder="Amount (EGP)"
              value={debt.amount_egp || ''}
              onChange={e => updateItem(i, 'amount_egp', e.target.value)}
            />
            <button
              className="btn-ghost"
              style={{ flexShrink: 0 }}
              onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
            >✕</button>
          </div>
        ))}
      </div>
      <button
        className="btn-ghost-sm"
        onClick={() => setItems(prev => [...prev, { name: '', amount_egp: 0 }])}
      >+ Add debt</button>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary"
          disabled={mut.isPending}
          onClick={() => mut.mutate({ debts: items.filter(d => d.name.trim()) })}
        >
          {mut.isPending ? 'Saving…' : 'Save debts'}
        </button>
      </div>
    </div>
  )
}

// ── Debt Payoff Plan ───────────────────────────────────────────────────────

function DebtPayoffPlan({ debts, surplusEgp }: { debts: Debt[]; surplusEgp: number }) {
  if (!debts.length) return null
  if (surplusEgp <= 0) {
    return (
      <p className="empty-hint" style={{ marginTop: 8 }}>
        No surplus — increase income or reduce expenses to start payoff.
      </p>
    )
  }
  const sorted = [...debts].filter(d => d.amount_egp > 0).sort((a, b) => a.amount_egp - b.amount_egp)
  let cumulative = 0
  const rows = sorted.map(debt => {
    cumulative += debt.amount_egp
    const months = Math.ceil(cumulative / surplusEgp)
    const date = new Date()
    date.setMonth(date.getMonth() + months)
    const label = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    return { ...debt, months, label }
  })

  return (
    <table className="finance-debt-table payoff-plan-table">
      <thead>
        <tr>
          <th style={{ paddingLeft: 0 }}>Debt</th>
          <th style={{ textAlign: 'right' }}>Amount</th>
          <th style={{ textAlign: 'right' }}>Clear by</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="debt-name">{r.name}</td>
            <td className="debt-amount">{r.amount_egp.toLocaleString()} EGP</td>
            <td className="debt-amount payoff-month">{r.label}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="debt-total-row">
          <td className="debt-name">🎉 Debt-free by</td>
          <td />
          <td className="debt-amount payoff-month">{rows[rows.length - 1].label}</td>
        </tr>
      </tfoot>
    </table>
  )
}

// ── Forex Widget ──────────────────────────────────────────────────────────

function ForexWidget() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [egpInput, setEgpInput] = useState('')
  const [usdInput, setUsdInput] = useState('')

  const ratesQuery = useQuery({ queryKey: ['exchange-rates'], queryFn: getExchangeRates })
  const updateMutation = useMutation({
    mutationFn: updateExchangeRates,
    onSuccess: (data: ExchangeRates) => {
      queryClient.setQueryData(['exchange-rates'], data)
      queryClient.invalidateQueries({ queryKey: ['finance-summary-v2'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      setEditing(false)
    },
  })

  const rates = ratesQuery.data

  function startEdit() {
    if (!rates) return
    setEgpInput(String(rates.eur_to_egp))
    setUsdInput(String(rates.eur_to_usd))
    setEditing(true)
  }

  function handleSave() {
    updateMutation.mutate({
      eur_to_egp: parseFloat(egpInput),
      eur_to_usd: parseFloat(usdInput),
    })
  }

  if (ratesQuery.isLoading || !rates) return null

  return (
    <div className="forex-widget">
      <div className="forex-widget-header">
        <span className="forex-widget-title">Exchange Rates</span>
        {!editing && (
          <button className="about-edit-btn" onClick={startEdit} type="button">Update</button>
        )}
      </div>

      {editing ? (
        <div>
          <div className="forex-edit-row">
            <div className="sp-field">
              <label className="sp-label">1 EUR = ? EGP</label>
              <input className="form-input" type="number" step="0.01" value={egpInput} onChange={e => setEgpInput(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label">1 EUR = ? USD</label>
              <input className="form-input" type="number" step="0.0001" value={usdInput} onChange={e => setUsdInput(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-ghost" onClick={() => setEditing(false)} type="button">Cancel</button>
            <button className="btn-primary" onClick={handleSave} type="button" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save Rates'}
            </button>
          </div>
        </div>
      ) : (
        <div className="forex-rates">
          <div className="forex-rate-item">
            <span className="forex-rate-label">EUR → EGP</span>
            <span className="forex-rate-value">1 € = {rates.eur_to_egp.toFixed(2)} EGP</span>
          </div>
          <div className="forex-rate-item">
            <span className="forex-rate-label">EUR → USD</span>
            <span className="forex-rate-value">1 € = {rates.eur_to_usd.toFixed(4)} $</span>
          </div>
          <div className="forex-rate-item">
            <span className="forex-rate-label">USD → EGP (derived)</span>
            <span className="forex-rate-value forex-rate-derived">1 $ = {rates.usd_to_egp.toFixed(2)} EGP</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Income History ─────────────────────────────────────────────────────────

function IncomeHistory() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [evDate, setEvDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [evSource, setEvSource] = useState('')
  const [evAmount, setEvAmount] = useState('')
  const [evNotes, setEvNotes] = useState('')

  const { data: events = [] } = useQuery<IncomeEvent[]>({
    queryKey: ['income-events'],
    queryFn: listIncomeEvents,
  })

  const createMut = useMutation({
    mutationFn: createIncomeEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income-events'] })
      setShowForm(false)
      setEvSource('')
      setEvAmount('')
      setEvNotes('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteIncomeEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['income-events'] }),
  })

  return (
    <div className="home-section">
      <div className="section-header">
        <h2 className="section-title">Income history</h2>
        {!showForm && (
          <button className="btn-ghost-sm" onClick={() => setShowForm(true)}>+ Log event</button>
        )}
      </div>

      {showForm && (
        <div className="finance-edit-form" style={{ marginBottom: 16 }}>
          <div className="sp-row">
            <div className="sp-field">
              <label className="sp-label">Date</label>
              <input className="form-input" type="date" value={evDate} onChange={e => setEvDate(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label">Amount (€)</label>
              <input className="form-input" type="number" placeholder="0" value={evAmount} onChange={e => setEvAmount(e.target.value)} />
            </div>
          </div>
          <div className="sp-field">
            <label className="sp-label">Source / description</label>
            <input className="form-input" placeholder="Client name, deal, etc." value={evSource} onChange={e => setEvSource(e.target.value)} />
          </div>
          <div className="sp-field">
            <label className="sp-label">Notes</label>
            <input className="form-input" placeholder="Optional…" value={evNotes} onChange={e => setEvNotes(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={createMut.isPending || !evSource.trim()}
              onClick={() => createMut.mutate({
                date: evDate,
                source: evSource.trim(),
                amount_eur: parseFloat(evAmount) || 0,
                notes: evNotes.trim(),
              })}
            >
              {createMut.isPending ? 'Saving…' : 'Log'}
            </button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="empty-hint">No income events logged yet.</p>
      ) : (
        <table className="finance-debt-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: 0 }}>Date</th>
              <th>Source</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id}>
                <td className="debt-name" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.date}</td>
                <td className="debt-name">
                  {ev.source}
                  {ev.notes && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{ev.notes}</span>}
                </td>
                <td className="debt-amount" style={{ color: 'var(--success)' }}>
                  {ev.amount_eur > 0 ? `€${fmtEur(ev.amount_eur)}` : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="sp-attachment-delete"
                    onClick={() => deleteMut.mutate(ev.id)}
                    title="Remove"
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function FinanceWorkspacePage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [editingDebts, setEditingDebts] = useState(false)

  const { data, isLoading, error } = useQuery<FinanceSummaryV2>({
    queryKey: ['finance-summary-v2'],
    queryFn: getFinanceSummaryV2,
  })

  if (isLoading) return <PageSkeleton />
  if (error || !data) return <div className="page-error">Could not load finance data.</div>

  const indPct = data.target_independent > 0
    ? Math.min(100, Math.round((data.independent_monthly / data.target_independent) * 100))
    : 0

  const totalDebt = (data.debts || []).reduce((s, d) => s + (d.amount_egp || 0), 0)

  const savingsPct = (data.savings_target_egp ?? 0) > 0
    ? Math.min(100, Math.round(((data.savings_current_egp ?? 0) / data.savings_target_egp) * 100))
    : 0

  function refresh() {
    qc.invalidateQueries({ queryKey: ['finance-summary-v2'] })
  }

  return (
    <div className="finance-page">

      {/* Section 1: Kyrgyzstan Trigger Bar */}
      <div className="unlock-bar finance-trigger-bar">
        <p className="unlock-eyebrow">Independent income target (Kyrgyzstan trigger)</p>
        <div className="unlock-numbers">
          <span className="unlock-current">€{fmtEur(data.independent_monthly)}/mo</span>
          <span className="unlock-sep"> / </span>
          <span className="unlock-target">€{fmtEur(data.target_independent)}/mo</span>
        </div>
        <div className="unlock-track">
          <div className="unlock-fill" style={{ width: `${indPct}%` }} />
        </div>
        <p className="unlock-sub">
          {data.independent_monthly <= 0
            ? '€0 independent income → send that outreach message today'
            : 'Keep going. Every client gets you closer.'}
        </p>
      </div>

      {/* Exchange Rates Widget */}
      <ForexWidget />

      {/* Section 2: 4 stat cards */}
      <div className="stat-grid finance-stat-grid">
        <div className="stat-card" style={{ cursor: 'default' }}>
          <span className="stat-value">~{formatK(data.income_egp)}</span>
          <span className="stat-label">Monthly income (EGP)</span>
        </div>
        <div className="stat-card" style={{ cursor: 'default' }}>
          <span className="stat-value">~{formatK(data.monthly_expenses_egp)}</span>
          <span className="stat-label">Monthly expenses (EGP)</span>
        </div>
        <div className="stat-card" style={{ cursor: 'default' }}>
          <span className="stat-value" style={{ color: data.surplus_egp >= 0 ? 'var(--success)' : '#c0392b' }}>
            ~{formatK(data.surplus_egp)}
          </span>
          <span className="stat-label">Surplus (EGP)</span>
        </div>
        <div className="stat-card" style={{ cursor: 'default' }}>
          <span className="stat-value">€{fmtEur(data.independent_monthly)}</span>
          <span className="stat-label">Independent income</span>
        </div>
      </div>

      {/* Section 2b: Monthly budget bar */}
      <MonthlyBudgetBar budget={data.monthly_budget_egp} expenses={Number(data.monthly_expenses_egp)} />

      {/* Section 3: Monthly Summary */}
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Monthly summary</h2>
          {!editing && (
            <button className="btn-ghost-sm" onClick={() => setEditing(true)}>Edit</button>
          )}
        </div>
        {editing ? (
          <EditForm
            data={data}
            onSaved={() => { refresh(); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="finance-summary-view">
            <div className="finance-summary-row">
              <span className="finance-summary-key">Income</span>
              <span className="finance-summary-val">€{fmtEur(data.income_eur)}/mo</span>
            </div>
            {data.income_egp_direct > 0 && (
              <div className="finance-summary-row">
                <span className="finance-summary-key">Direct EGP income</span>
                <span className="finance-summary-val">{formatK(data.income_egp_direct)} EGP/mo</span>
              </div>
            )}
            <div className="finance-summary-row">
              <span className="finance-summary-key">Sources</span>
              <span className="finance-summary-val">{data.income_sources_text || '—'}</span>
            </div>
            <div className="finance-summary-row">
              <span className="finance-summary-key">Independent income</span>
              <span className="finance-summary-val">€{fmtEur(data.independent_monthly)}/mo</span>
            </div>
            <div className="finance-summary-row">
              <span className="finance-summary-key">EGP/EUR rate</span>
              <span className="finance-summary-val">{data.exchange_rate ?? 60}</span>
            </div>
            <div className="finance-summary-row">
              <span className="finance-summary-key">Monthly expenses</span>
              <span className="finance-summary-val">{formatK(data.monthly_expenses_egp)} EGP</span>
            </div>
            {data.notes && (
              <div className="finance-summary-row">
                <span className="finance-summary-key">Notes</span>
                <span className="finance-summary-val">{data.notes}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3b: Savings Target */}
      {((data.savings_target_egp ?? 0) > 0 || !editing) && (
        <div className="home-section">
          <div className="section-header">
            <h2 className="section-title">Emergency fund</h2>
            <span className="finance-summary-key" style={{ marginLeft: 'auto' }}>
              {formatK(data.savings_current_egp ?? 0)} / {formatK(data.savings_target_egp ?? 0)} EGP
            </span>
          </div>
          {(data.savings_target_egp ?? 0) > 0 ? (
            <>
              <div className="unlock-track" style={{ marginBottom: 6 }}>
                <div className="unlock-fill" style={{ width: `${savingsPct}%`, background: '#16a34a' }} />
              </div>
              <p className="sp-hint">
                {savingsPct}% funded
                {data.surplus_egp > 0 && data.savings_target_egp > 0 && (
                  ` — ~${Math.ceil(((data.savings_target_egp ?? 0) - (data.savings_current_egp ?? 0)) / data.surplus_egp)} months at current surplus`
                )}
              </p>
            </>
          ) : (
            <p className="sp-hint">Set a savings target in Edit to track your emergency fund.</p>
          )}
        </div>
      )}

      {/* Section 4: Debts */}
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Debts — {formatK(totalDebt)} EGP total</h2>
          {!editingDebts && (
            <button className="btn-ghost-sm" onClick={() => setEditingDebts(true)}>Edit debts</button>
          )}
        </div>
        {editingDebts ? (
          <DebtEditForm
            debts={data.debts || []}
            onSaved={() => { refresh(); setEditingDebts(false) }}
            onCancel={() => setEditingDebts(false)}
          />
        ) : (
          <table className="finance-debt-table">
            <tbody>
              {(data.debts || []).map((debt, i) => (
                <tr key={i}>
                  <td className="debt-name">{debt.name}</td>
                  <td className="debt-amount">{debt.amount_egp.toLocaleString()} EGP</td>
                </tr>
              ))}
              <tr className="debt-total-row">
                <td className="debt-name">Total</td>
                <td className="debt-amount">{totalDebt.toLocaleString()} EGP</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Section 5: Debt Payoff Plan */}
      {!editingDebts && (data.debts || []).length > 0 && (
        <div className="home-section">
          <div className="section-header">
            <h2 className="section-title">Payoff plan</h2>
            <span className="finance-summary-key" style={{ marginLeft: 'auto' }}>
              surplus ~{formatK(data.surplus_egp)} EGP/mo
            </span>
          </div>
          <p className="sp-hint" style={{ marginBottom: 10 }}>Snowball method — smallest debt first, using full monthly surplus.</p>
          <DebtPayoffPlan debts={data.debts || []} surplusEgp={data.surplus_egp} />
        </div>
      )}

      {/* Section 6: Income History */}
      <IncomeHistory />
    </div>
  )
}
