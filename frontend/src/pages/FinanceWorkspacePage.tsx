import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import { HubTabs } from '../components/HubTabs'
import { CollapsibleSection } from '../components/CollapsibleSection'
import {
  getFinanceSummaryV2, updateFinanceSummaryV2,
  listIncomeEvents, createIncomeEvent, deleteIncomeEvent,
  getExchangeRates, updateExchangeRates,
  createFinanceEntry, getRecurringChecklist,
  getCategoryBreakdown, getBudgetPlan, upsertBudgetPlan,
  getDebtOverview, createDebt, updateDebt, deleteDebt,
} from '../lib/api'
import type { ExchangeRates, FinanceSummaryV2, IncomeEvent, RecurringChecklistItem, CategoryBreakdownItem } from '../lib/types'
import type { DebtOverview, DebtEntry as DebtEntryType } from '../lib/api'

type Debt = { name: string; amount_egp: number }

function fmtEur(n: number | string): string {
  return Math.round(Number(n)).toLocaleString('en-GB')
}

function formatK(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + '-01') // first of that month
  const today = new Date()
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
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

// ── Debt Command Center (new model-backed) ────────────────────────────────

function DebtCommandCenter() {
  const qc = useQueryClient()
  const [extraEgp, setExtraEgp] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCreditor, setNewCreditor] = useState('')
  const [newOriginal, setNewOriginal] = useState('')
  const [newRemaining, setNewRemaining] = useState('')
  const [newMonthly, setNewMonthly] = useState('')

  const { data: overview } = useQuery<DebtOverview>({
    queryKey: ['debt-overview', extraEgp],
    queryFn: () => getDebtOverview(extraEgp > 0 ? extraEgp : undefined),
    staleTime: 60_000,
  })

  const addMut = useMutation({
    mutationFn: createDebt,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debt-overview'] })
      setShowAddForm(false)
      setNewCreditor(''); setNewOriginal(''); setNewRemaining(''); setNewMonthly('')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDebt(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debt-overview'] }),
  })

  const markPaidMut = useMutation({
    mutationFn: ({ id }: { id: string }) => updateDebt(id, { paid_off: true, remaining_amount: '0' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debt-overview'] }),
  })

  if (!overview) return null

  const totalEgp = overview.total_remaining_egp
  const hasDebts = overview.debts.length > 0

  return (
    <div className="debt-command-center">
      <div className="debt-cc-header">
        <div>
          <span className="debt-cc-total">{Math.round(totalEgp).toLocaleString()} EGP</span>
          <span className="caption"> total remaining</span>
        </div>
        <button className="btn-ghost-sm" onClick={() => setShowAddForm(p => !p)}>
          {showAddForm ? 'Cancel' : '+ Add debt'}
        </button>
      </div>

      {showAddForm && (
        <div className="debt-add-form">
          <input className="form-input" placeholder="Creditor name" value={newCreditor} onChange={e => setNewCreditor(e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input className="form-input" type="number" placeholder="Original (EGP)" value={newOriginal} onChange={e => setNewOriginal(e.target.value)} />
            <input className="form-input" type="number" placeholder="Remaining (EGP)" value={newRemaining} onChange={e => setNewRemaining(e.target.value)} />
            <input className="form-input" type="number" placeholder="Monthly pay (EGP)" value={newMonthly} onChange={e => setNewMonthly(e.target.value)} />
          </div>
          <button
            className="btn-primary"
            disabled={addMut.isPending || !newCreditor || !newOriginal}
            onClick={() => addMut.mutate({
              creditor: newCreditor,
              original_amount: newOriginal,
              remaining_amount: newRemaining || newOriginal,
              monthly_payment: newMonthly || '0',
            } as Partial<DebtEntryType>)}
          >
            {addMut.isPending ? 'Adding…' : 'Add debt'}
          </button>
        </div>
      )}

      {hasDebts && (
        <div className="debt-list">
          {overview.debts.map(d => {
            const pct = d.paid_pct
            return (
              <div key={d.id} className="debt-item">
                <div className="debt-item-header">
                  <span className="debt-item-name">{d.creditor}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="debt-item-amount">{Math.round(parseFloat(d.remaining_amount)).toLocaleString()} EGP</span>
                    <button className="btn-ghost-sm" style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }} onClick={() => markPaidMut.mutate({ id: d.id })}>✓ Paid off</button>
                    <button className="btn-ghost-sm" style={{ padding: '2px 6px', fontSize: 'var(--text-xs)', color: 'var(--error, #dc2626)' }} onClick={() => deleteMut.mutate(d.id)}>✕</button>
                  </div>
                </div>
                <div className="debt-progress-bar">
                  <div className="debt-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="caption">{Math.round(pct)}% paid</span>
                  {parseFloat(d.monthly_payment) > 0 && (
                    <span className="caption">{Math.round(parseFloat(d.monthly_payment)).toLocaleString()} EGP/mo</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasDebts && (
        <div className="debt-scenarios">
          <div className="debt-scenarios-header">
            <span className="label-mono">Payoff Scenarios</span>
          </div>
          <div className="debt-scenario-grid">
            {Object.entries(overview.scenarios).map(([key, s]) => (
              <div key={key} className="debt-scenario-card">
                <p className="debt-scenario-label">{s.label}</p>
                <p className="debt-scenario-amount">{Math.round(s.monthly_egp).toLocaleString()} EGP/mo</p>
                <p className="debt-scenario-date">
                  {s.payoff_date
                    ? new Date(s.payoff_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            ))}
          </div>
          <div className="debt-slider-row">
            <label className="sp-label">Extra monthly payment: <strong>{extraEgp.toLocaleString()} EGP</strong></label>
            <input
              type="range"
              min={0}
              max={10000}
              step={250}
              value={extraEgp}
              onChange={e => setExtraEgp(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            {overview.scenarios.custom && (
              <p className="caption">
                With +{extraEgp.toLocaleString()} EGP/mo → debt-free by{' '}
                <strong>
                  {overview.scenarios.custom.payoff_date
                    ? new Date(overview.scenarios.custom.payoff_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                    : '—'}
                </strong>
                {' '}({overview.scenarios.custom.months} months)
              </p>
            )}
          </div>
        </div>
      )}

      {!hasDebts && (
        <p className="empty-hint">No debts tracked. Add your debts to see a payoff plan.</p>
      )}
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
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { ...debt, months, label, dateStr }
  })

  const finalRow = rows[rows.length - 1]

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
          <td className="debt-name">Debt-free by</td>
          <td />
          <td className="debt-amount payoff-month">{finalRow.label}</td>
        </tr>
        <tr>
          <td colSpan={3} style={{ paddingTop: 4, fontSize: 14, color: 'var(--text-muted)' }}>
            {daysUntil(finalRow.dateStr)} days away
          </td>
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
                <td className="debt-name" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{ev.date}</td>
                <td className="debt-name">
                  {ev.source}
                  {ev.notes && <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{ev.notes}</span>}
                </td>
                <td className="debt-amount" style={{ color: 'var(--success)' }}>
                  {ev.amount_eur > 0 ? `€${fmtEur(ev.amount_eur)}` : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="sp-attachment-delete"
                    onClick={() => {
                      if (!window.confirm('Delete this income event?')) return
                      deleteMut.mutate(ev.id)
                    }}
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

// ── Recurring Checklist ────────────────────────────────────────────────────

function RecurringChecklist() {
  const { data: items = [], isLoading } = useQuery<RecurringChecklistItem[]>({
    queryKey: ['recurring-checklist'],
    queryFn: getRecurringChecklist,
  })

  if (isLoading) return null

  return (
    <div className="home-section">
      <div className="section-header">
        <h2 className="section-title">This Month's Recurring Items</h2>
      </div>
      {items.length === 0 ? (
        <p className="empty-hint">No recurring items found.</p>
      ) : (
        <div className="recurring-list">
          {items.map((item, i) => (
            <div key={i} className="recurring-item">
              <div className={`recurring-check ${item.logged_this_month ? 'done' : 'pending'}`}>
                {item.logged_this_month ? '✓' : ''}
              </div>
              <span className="recurring-item-source">{item.source}</span>
              <span className="recurring-item-amount">
                {Math.round(item.amount_egp).toLocaleString()} EGP
              </span>
              <span className={`recurring-item-type ${item.type}`}>{item.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Income Streams ────────────────────────────────────────────────────────

type IncomeSourceItem = {
  id: string
  name: string
  category: string
  monthly_target_eur: string
  baseline_amount_eur: string | null
  active: boolean
  notes: string
}

function IncomeStreams({ independentMonthly }: { independentMonthly: number }) {
  const TARGET = 1000 // €1,000/mo

  const { data, isLoading } = useQuery<{ results: IncomeSourceItem[] }>({
    queryKey: ['income-sources'],
    queryFn: () => import('../lib/api').then(api => api.listIncomeSources()),
  })

  const sources = data?.results ?? []
  const activeSources = sources.filter(s => s.active)

  if (isLoading) return null

  return (
    <div className="home-section">
      <div className="section-header">
        <h2 className="section-title">Income Streams → €1,000/mo</h2>
        <span className="finance-summary-key" style={{ marginLeft: 'auto' }}>
          €{fmtEur(independentMonthly)} / €{TARGET}
        </span>
      </div>
      {activeSources.length === 0 ? (
        <p className="empty-hint">
          No income streams added yet — add one to track your path to €1,000/mo
        </p>
      ) : (
        <div className="income-stream-list">
          {activeSources.map(src => {
            const target = parseFloat(src.monthly_target_eur) || 0
            const pct = target > 0 ? Math.min(100, Math.round((parseFloat(src.baseline_amount_eur ?? '0') / target) * 100)) : 0
            const ofTarget = target > 0 ? Math.round((target / TARGET) * 100) : 0
            return (
              <div key={src.id} className="income-stream-item">
                <div className="income-stream-header">
                  <span className="income-stream-name">{src.name}</span>
                  <span className="income-stream-target">€{fmtEur(target)}/mo target · {ofTarget}% of €1000</span>
                </div>
                <div className="income-stream-bar-track">
                  <div className="income-stream-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="income-stream-pct">{pct}% of target</span>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <span>Total independent</span>
        <span style={{ fontWeight: 600, color: independentMonthly >= TARGET ? '#22c55e' : 'var(--text)' }}>
          €{fmtEur(independentMonthly)} / €{TARGET}
        </span>
      </div>
    </div>
  )
}

// ── Debt Payment Logging ──────────────────────────────────────────────────

function DebtSection({
  data,
  editingDebts,
  setEditingDebts,
  onRefresh,
}: {
  data: FinanceSummaryV2
  editingDebts: boolean
  setEditingDebts: (v: boolean) => void
  onRefresh: () => void
}) {
  const qc = useQueryClient()
  const [payingDebtIdx, setPayingDebtIdx] = useState<number | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')

  const totalDebt = (data.debts || []).reduce((s, d) => s + (d.amount_egp || 0), 0)

  const logPaymentMut = useMutation({
    mutationFn: async ({ debt, amount, notes }: { debt: Debt; amount: number; notes: string }) => {
      const today = new Date().toISOString().slice(0, 10)
      await createFinanceEntry({
        type: 'expense',
        source: debt.name,
        category: 'debt_payment',
        amount: String(amount),
        currency: 'EGP',
        date: today,
        is_independent: false,
        is_recurring: false,
        notes,
      })
      const updatedDebts = data.debts.map(d =>
        d.name === debt.name ? { ...d, amount_egp: Math.max(0, d.amount_egp - amount) } : d
      )
      await updateFinanceSummaryV2({ debts: updatedDebts })
    },
    onSuccess: () => {
      setPayingDebtIdx(null)
      setPayAmount('')
      setPayNotes('')
      qc.invalidateQueries({ queryKey: ['finance-summary-v2'] })
      qc.invalidateQueries({ queryKey: ['finance-entries'] })
      onRefresh()
    },
  })

  if (editingDebts) {
    return (
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Debts — {formatK(totalDebt)} EGP total</h2>
        </div>
        <DebtEditForm
          debts={data.debts || []}
          onSaved={() => { onRefresh(); setEditingDebts(false) }}
          onCancel={() => setEditingDebts(false)}
        />
      </div>
    )
  }

  return (
    <div className="home-section">
      <div className="section-header">
        <h2 className="section-title">Debts — {formatK(totalDebt)} EGP total</h2>
        <button className="btn-ghost-sm" onClick={() => setEditingDebts(true)}>Edit debts</button>
      </div>
      <table className="finance-debt-table">
        <tbody>
          {(data.debts || []).map((debt, i) => (
            <>
              <tr key={i}>
                <td className="debt-name">{debt.name}</td>
                <td className="debt-amount">{debt.amount_egp.toLocaleString()} EGP</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn-ghost-sm"
                    style={{ fontSize: 14 }}
                    onClick={() => setPayingDebtIdx(payingDebtIdx === i ? null : i)}
                  >
                    Log payment
                  </button>
                </td>
              </tr>
              {payingDebtIdx === i && (
                <tr key={`pay-${i}`}>
                  <td colSpan={3}>
                    <div className="debt-payment-form">
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Amount (EGP)"
                        value={payAmount}
                        min="0"
                        onChange={e => setPayAmount(e.target.value)}
                        style={{ width: 130 }}
                      />
                      <input
                        className="form-input"
                        placeholder="Notes (optional)"
                        value={payNotes}
                        onChange={e => setPayNotes(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: 14 }}
                        disabled={!payAmount || logPaymentMut.isPending}
                        onClick={() => logPaymentMut.mutate({
                          debt,
                          amount: parseFloat(payAmount) || 0,
                          notes: payNotes,
                        })}
                      >
                        {logPaymentMut.isPending ? '…' : 'Log'}
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '6px 10px', fontSize: 14 }}
                        onClick={() => setPayingDebtIdx(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
          <tr className="debt-total-row">
            <td className="debt-name">Total</td>
            <td className="debt-amount">{totalDebt.toLocaleString()} EGP</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── What If Forecast ──────────────────────────────────────────────────────

function ForecastWidget({ data, egpRate }: { data: FinanceSummaryV2; egpRate: number }) {
  const [scenarioIncome, setScenarioIncome] = useState(0)
  const TARGET_EUR = data.target_independent || 1000

  const scenarioSurplusEgp = data.surplus_egp + (scenarioIncome * egpRate)
  const kyrgyzstonReached = scenarioIncome >= TARGET_EUR

  const totalDebt = (data.debts || []).reduce((s, d) => s + (d.amount_egp || 0), 0)
  const monthsToDebtFree = scenarioSurplusEgp > 0 ? Math.ceil(totalDebt / scenarioSurplusEgp) : null
  const debtFreeDate = monthsToDebtFree
    ? (() => {
        const d = new Date()
        d.setMonth(d.getMonth() + monthsToDebtFree)
        return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      })()
    : '—'

  return (
    <div className="home-section">
      <div className="section-header">
        <h2 className="section-title">What If?</h2>
      </div>
      <div className="forecast-widget">
        <div className="forecast-input-row">
          <span className="forecast-label">If my independent income reaches €</span>
          <input
            type="number"
            className="form-input"
            min={0}
            max={2000}
            step={50}
            value={scenarioIncome}
            onChange={e => setScenarioIncome(parseFloat(e.target.value) || 0)}
            style={{ width: 100 }}
          />
          <span className="forecast-label">/mo</span>
        </div>
        <div className="forecast-results">
          <div className="forecast-result-item">
            <div className="forecast-result-label">Monthly surplus</div>
            <div className="forecast-result-value" style={{ color: scenarioSurplusEgp >= 0 ? '#22c55e' : '#ef4444' }}>
              {Math.round(scenarioSurplusEgp).toLocaleString()} EGP
            </div>
          </div>
          <div className="forecast-result-item">
            <div className="forecast-result-label">Kyrgyzstan trigger</div>
            <div className="forecast-result-value" style={{ color: kyrgyzstonReached ? '#22c55e' : 'var(--muted)' }}>
              {kyrgyzstonReached ? 'Reached' : 'Not yet'}
            </div>
          </div>
          <div className="forecast-result-item">
            <div className="forecast-result-label">Debt-free by</div>
            <div className="forecast-result-value">{debtFreeDate}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Category Budgets ──────────────────────────────────────────────────────

const ALL_EXPENSE_CATEGORIES = [
  { value: 'food',         label: 'Food & Groceries',  emoji: '🍔' },
  { value: 'housing',      label: 'Housing & Rent',     emoji: '🏠' },
  { value: 'transport',    label: 'Transport',           emoji: '🚗' },
  { value: 'utilities',    label: 'Utilities & Bills',  emoji: '💡' },
  { value: 'education',    label: 'Education',           emoji: '📚' },
  { value: 'children',     label: 'Children',            emoji: '👶' },
  { value: 'health',       label: 'Health',              emoji: '🏥' },
  { value: 'debt_payment', label: 'Debt Payment',        emoji: '💳' },
  { value: 'business',     label: 'Business',            emoji: '💼' },
  { value: 'savings',      label: 'Savings',             emoji: '🏦' },
  { value: 'other',        label: 'Other',               emoji: '📦' },
]

// ── Month navigation helpers ──────────────────────────────────────────────────

function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// ── Budget Planner ────────────────────────────────────────────────────────────

function BudgetPlannerSection({ summaryData }: { summaryData: FinanceSummaryV2 }) {
  const qc = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr)
  const [localBudgets, setLocalBudgets] = useState<Record<string, number>>({})
  const [localNotes, setLocalNotes] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // Fetch saved plan for the selected month
  const planQuery = useQuery({
    queryKey: ['budget-plan', selectedMonth],
    queryFn: () => getBudgetPlan(selectedMonth),
    retry: false,
  })

  // Fetch actual spending for the selected month
  const breakdownQuery = useQuery({
    queryKey: ['finance-category-breakdown', selectedMonth],
    queryFn: () => getCategoryBreakdown(selectedMonth),
  })

  // Sync plan data into local state when it loads (and not dirty)
  useEffect(() => {
    if (planQuery.data && !isDirty) {
      setLocalBudgets(planQuery.data.planned_budgets ?? {})
      setLocalNotes(planQuery.data.notes ?? '')
    }
    if (planQuery.isError) {
      setLocalBudgets({})
      setLocalNotes('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planQuery.data, planQuery.isError])

  // Reset dirty flag when switching months
  useEffect(() => { setIsDirty(false) }, [selectedMonth])

  // Build actual spending map from breakdown
  const actualMap = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {}
    for (const item of (breakdownQuery.data ?? []) as CategoryBreakdownItem[]) {
      m[item.category] = item.total_egp
    }
    return m
  }, [breakdownQuery.data])

  const incomeEgp     = summaryData.income_egp ?? 0
  const totalPlanned  = Object.values(localBudgets).reduce((s, v) => s + (v || 0), 0)
  const totalActual   = Object.values(actualMap).reduce((s, v) => s + v, 0)
  const unallocated   = incomeEgp - totalPlanned
  const surplus       = incomeEgp - totalActual

  // Copy from previous month
  const copyMut = useMutation({
    mutationFn: () => getBudgetPlan(shiftMonth(selectedMonth, -1)),
    onSuccess: (prev) => {
      setLocalBudgets(prev.planned_budgets ?? {})
      setLocalNotes(prev.notes ?? '')
      setIsDirty(true)
    },
  })

  // Save plan
  const saveMut = useMutation({
    mutationFn: () => upsertBudgetPlan(selectedMonth, {
      month: selectedMonth,
      planned_budgets: localBudgets,
      notes: localNotes,
    }),
    onSuccess: () => {
      setIsDirty(false)
      qc.invalidateQueries({ queryKey: ['budget-plan', selectedMonth] })
    },
  })

  function setBudgetLine(cat: string, val: number) {
    setLocalBudgets(prev => ({ ...prev, [cat]: val }))
    setIsDirty(true)
  }

  return (
    <div className="home-section">
      {/* Header */}
      <div className="bp-section-header">
        <h2 className="section-title">Monthly Budget Plan</h2>
        <div className="month-nav">
          <button className="month-nav-btn" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}>‹</button>
          <span className="month-nav-label">{formatMonthLabel(selectedMonth)}</span>
          <button className="month-nav-btn" onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}>›</button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bp-header-bar">
        <div className="bp-header-stat">
          <span className="bp-header-label">Income</span>
          <span className="bp-header-value">{Math.round(incomeEgp).toLocaleString()} EGP</span>
        </div>
        <div className="bp-header-stat">
          <span className="bp-header-label">Total Planned</span>
          <span className="bp-header-value" style={{ color: totalPlanned > incomeEgp ? '#dc2626' : undefined }}>
            {Math.round(totalPlanned).toLocaleString()} EGP
          </span>
        </div>
        <div className="bp-header-stat">
          <span className="bp-header-label">Total Actual</span>
          <span className="bp-header-value">{Math.round(totalActual).toLocaleString()} EGP</span>
        </div>
        <div className="bp-header-stat">
          <span className="bp-header-label">Unallocated</span>
          <span className="bp-header-value" style={{ color: unallocated < 0 ? '#dc2626' : '#22c55e' }}>
            {Math.round(unallocated).toLocaleString()} EGP
          </span>
        </div>
        <div className="bp-header-stat">
          <span className="bp-header-label">Surplus</span>
          <span className="bp-header-value" style={{ color: surplus >= 0 ? '#22c55e' : '#dc2626' }}>
            {Math.round(surplus).toLocaleString()} EGP
          </span>
        </div>
      </div>

      {/* Category rows */}
      <div className="bp-category-list">
        <div className="bp-row bp-row--header">
          <span>Category</span>
          <span>Budget (EGP)</span>
          <span>Actual</span>
          <span></span>
          <span>Δ</span>
        </div>
        {ALL_EXPENSE_CATEGORIES.map(cat => {
          const planned = localBudgets[cat.value] ?? 0
          const actual  = actualMap[cat.value] ?? 0
          const pct     = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0
          const isOver  = actual > planned && planned > 0
          const delta   = planned - actual  // positive = left, negative = over

          return (
            <div key={cat.value} className="bp-row">
              <span className="bp-row-label">{cat.emoji} {cat.label}</span>
              <input
                type="number"
                className="form-input bp-row-input"
                placeholder="0"
                min="0"
                value={planned || ''}
                onChange={e => setBudgetLine(cat.value, parseFloat(e.target.value) || 0)}
              />
              <span className="bp-row-actual">{Math.round(actual).toLocaleString()}</span>
              <div className="bp-row-bar-wrap">
                <div
                  className={`bp-row-bar-fill${isOver ? ' over' : ''}`}
                  style={{ width: `${planned > 0 ? pct : 0}%` }}
                />
              </div>
              <span className={`bp-delta-badge${isOver ? ' over' : delta > 0 ? ' under' : ' zero'}`}>
                {planned === 0
                  ? '—'
                  : delta > 0
                    ? `${Math.round(delta).toLocaleString()} left`
                    : `${Math.round(Math.abs(delta)).toLocaleString()} over`
                }
              </span>
            </div>
          )
        })}
      </div>

      {/* Notes */}
      <textarea
        className="form-input bp-notes"
        placeholder="Notes for this month's plan…"
        rows={2}
        value={localNotes}
        onChange={e => { setLocalNotes(e.target.value); setIsDirty(true) }}
      />

      {/* Action row */}
      <div className="bp-action-row">
        <button
          className="btn-secondary"
          disabled={copyMut.isPending}
          onClick={() => copyMut.mutate()}
          title="Pre-fill from previous month's saved plan"
        >
          {copyMut.isPending ? 'Copying…' : '↑ Copy from last month'}
        </button>
        <button
          className="btn-primary"
          disabled={!isDirty || saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          {saveMut.isPending ? 'Saving…' : isDirty ? '● Save Plan' : 'Saved'}
        </button>
      </div>
    </div>
  )
}

function CategoryBudgets({ data, onRefresh }: { data: FinanceSummaryV2; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false)
  const [budgets, setBudgets] = useState<Record<string, number>>(data.category_budgets || {})
  const [newCat, setNewCat] = useState('')
  const [newAmt, setNewAmt] = useState('')

  const mut = useMutation({
    mutationFn: (payload: Record<string, number>) =>
      updateFinanceSummaryV2({ category_budgets: payload }),
    onSuccess: () => {
      setEditing(false)
      onRefresh()
    },
  })

  const existingKeys = Object.keys(budgets)

  if (!editing) {
    return (
      <div className="home-section">
        <div className="section-header">
          <h2 className="section-title">Monthly Category Budgets</h2>
          <button className="btn-ghost-sm" onClick={() => {
            setBudgets(data.category_budgets || {})
            setEditing(true)
          }}>Edit</button>
        </div>
        {existingKeys.length === 0 ? (
          <p className="empty-hint">No category budgets set. Click Edit to add budgets per expense category.</p>
        ) : (
          <div className="cat-budget-list">
            {existingKeys.map(key => {
              const label = ALL_EXPENSE_CATEGORIES.find(c => c.value === key)?.label ?? key
              return (
                <div key={key} className="cat-budget-row">
                  <span className="cat-budget-label">{label}</span>
                  <span className="cat-budget-amount">{(budgets[key] || 0).toLocaleString()} EGP/mo</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="home-section">
      <div className="section-header">
        <h2 className="section-title">Monthly Category Budgets</h2>
      </div>
      <div className="cat-budget-list">
        {existingKeys.map(key => {
          const label = ALL_EXPENSE_CATEGORIES.find(c => c.value === key)?.label ?? key
          return (
            <div key={key} className="cat-budget-row">
              <span className="cat-budget-label">{label}</span>
              <input
                type="number"
                className="form-input"
                style={{ width: 120 }}
                value={budgets[key] || ''}
                onChange={e => setBudgets(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
              />
              <button className="btn-ghost" style={{ fontSize: 14 }}
                onClick={() => setBudgets(prev => {
                  const next = { ...prev }
                  delete next[key]
                  return next
                })}>
                Remove
              </button>
            </div>
          )
        })}
      </div>
      <div className="cat-budget-add-row" style={{ marginTop: 12 }}>
        <select
          className="form-input"
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
        >
          <option value="">— Add category —</option>
          {ALL_EXPENSE_CATEGORIES.filter(c => !budgets[c.value]).map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input
          type="number"
          className="form-input"
          placeholder="EGP/mo"
          value={newAmt}
          onChange={e => setNewAmt(e.target.value)}
        />
        <button
          className="btn-ghost-sm"
          disabled={!newCat || !newAmt}
          onClick={() => {
            if (!newCat || !newAmt) return
            setBudgets(prev => ({ ...prev, [newCat]: parseFloat(newAmt) || 0 }))
            setNewCat('')
            setNewAmt('')
          }}
        >
          Add
        </button>
      </div>
      <div className="modal-actions" style={{ marginTop: 12 }}>
        <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
        <button className="btn-primary" disabled={mut.isPending} onClick={() => mut.mutate(budgets)}>
          {mut.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Net Worth Card ────────────────────────────────────────────────────────

function NetWorthCard({ data }: { data: FinanceSummaryV2 }) {
  const totalDebt = (data.debts || []).reduce((s, d) => s + (d.amount_egp || 0), 0)
  const netWorth = (data.savings_current_egp || 0) - totalDebt
  const isPositive = netWorth >= 0
  const display = isPositive
    ? `+${Math.round(netWorth).toLocaleString()} EGP`
    : `${Math.round(netWorth).toLocaleString()} EGP`

  return (
    <div className="net-worth-card" style={{ margin: '12px 0' }}>
      <div>
        <div className="net-worth-label">Net Worth</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>
          Savings − Debt
        </div>
      </div>
      <div className={`net-worth-value ${isPositive ? 'positive' : 'negative'}`}>
        {display}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function FinanceWorkspacePage() {
  const qc = useQueryClient()
  const [finTab, setFinTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [editingDebts, setEditingDebts] = useState(false)

  const { data, isLoading, error } = useQuery<FinanceSummaryV2>({
    queryKey: ['finance-summary-v2'],
    queryFn: getFinanceSummaryV2,
  })

  const ratesQuery = useQuery({ queryKey: ['exchange-rates'], queryFn: getExchangeRates })

  if (isLoading) return <PageSkeleton />
  if (error || !data) return <div className="page-error">Could not load finance data.</div>

  const indPct = data.target_independent > 0
    ? Math.min(100, Math.round((data.independent_monthly / data.target_independent) * 100))
    : 0

  const savingsPct = (data.savings_target_egp ?? 0) > 0
    ? Math.min(100, Math.round(((data.savings_current_egp ?? 0) / data.savings_target_egp) * 100))
    : 0

  const egpRate = ratesQuery.data?.eur_to_egp ?? data.exchange_rate ?? 60

  function refresh() {
    qc.invalidateQueries({ queryKey: ['finance-summary-v2'] })
  }

  const FIN_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'budget',   label: 'Budget'   },
    { id: 'income',   label: 'Income'   },
    { id: 'debts',    label: 'Debts'    },
  ]

  return (
    <div className="finance-page">

      {/* Kyrgyzstan Trigger Bar — always visible, key metric */}
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

      {/* Internal tabs */}
      <HubTabs tabs={FIN_TABS} active={finTab} onChange={setFinTab} />

      {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
      {finTab === 'overview' && (
        <>
          <CollapsibleSection title="Key Numbers" storageKey="fin-stats" defaultOpen={true}>
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
          </CollapsibleSection>

          <CollapsibleSection title="Net Worth" storageKey="fin-networth" defaultOpen={true}>
            <NetWorthCard data={data} />
          </CollapsibleSection>

          <CollapsibleSection title="Monthly Budget Progress" storageKey="fin-budgetbar" defaultOpen={true}>
            <MonthlyBudgetBar budget={data.monthly_budget_egp} expenses={Number(data.monthly_expenses_egp)} />
          </CollapsibleSection>

          <CollapsibleSection title="Exchange Rates" storageKey="fin-forex" defaultOpen={false}>
            <ForexWidget />
          </CollapsibleSection>

          <CollapsibleSection title="What If? Forecast" storageKey="fin-forecast" defaultOpen={false}>
            <ForecastWidget data={data} egpRate={egpRate} />
          </CollapsibleSection>
        </>
      )}

      {/* ── BUDGET TAB ───────────────────────────────────────────── */}
      {finTab === 'budget' && (
        <>
          <CollapsibleSection title="Monthly Summary" storageKey="fin-summary" defaultOpen={true}>
            <div className="home-section">
              <div className="section-header">
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
          </CollapsibleSection>

          <CollapsibleSection title="Monthly Budget Planner" storageKey="fin-bp" defaultOpen={true}>
            <BudgetPlannerSection summaryData={data} />
          </CollapsibleSection>

          <CollapsibleSection title="Category Budgets (Global Template)" storageKey="fin-catbudgets" defaultOpen={false}>
            <CategoryBudgets data={data} onRefresh={refresh} />
          </CollapsibleSection>

          <CollapsibleSection title="Recurring Checklist" storageKey="fin-recurring" defaultOpen={true}>
            <RecurringChecklist />
          </CollapsibleSection>
        </>
      )}

      {/* ── INCOME TAB ───────────────────────────────────────────── */}
      {finTab === 'income' && (
        <>
          <CollapsibleSection title="Income Streams" storageKey="fin-streams" defaultOpen={true}>
            <IncomeStreams independentMonthly={data.independent_monthly} />
          </CollapsibleSection>

          <CollapsibleSection title="Income History" storageKey="fin-history" defaultOpen={true}>
            <IncomeHistory />
          </CollapsibleSection>
        </>
      )}

      {/* ── DEBTS TAB ────────────────────────────────────────────── */}
      {finTab === 'debts' && (
        <>
          <CollapsibleSection title="Emergency Fund" storageKey="fin-emergency" defaultOpen={true}>
            <div className="home-section">
              <div className="section-header">
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
                <p className="sp-hint">Set a savings target in the Budget tab → Monthly Summary → Edit.</p>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Debts" storageKey="fin-debts" defaultOpen={true}
            badge={String((data.debts || []).length)}>
            <DebtSection
              data={data}
              editingDebts={editingDebts}
              setEditingDebts={setEditingDebts}
              onRefresh={refresh}
            />
          </CollapsibleSection>

          {!editingDebts && (data.debts || []).length > 0 && (
            <CollapsibleSection title="Payoff Plan" storageKey="fin-payoff" defaultOpen={true}>
              <div className="home-section">
                <p className="sp-hint" style={{ marginBottom: 10 }}>Snowball method — smallest debt first, using full monthly surplus ({formatK(data.surplus_egp)} EGP/mo).</p>
                <DebtPayoffPlan debts={data.debts || []} surplusEgp={data.surplus_egp} />
              </div>
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Debt Command Center" storageKey="fin-debt-engine" defaultOpen={false}>
            <div className="home-section">
              <p className="sp-hint" style={{ marginBottom: 12 }}>
                Track individual debts with progress bars and scenario modeling.
              </p>
              <DebtCommandCenter />
            </div>
          </CollapsibleSection>
        </>
      )}

    </div>
  )
}
