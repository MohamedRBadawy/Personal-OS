// [AR] لوحة الشراكات الرأسمالية — عرض وإنشاء وإدارة خطوات الشراكات
// [EN] Equity partnerships panel — list, create, and action equity partnerships

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listPartnerships,
  createPartnership,
  createPartnershipAction,
  completePartnershipAction,
} from '../lib/api'
import type { EquityPartnership, EquityPartnershipPayload, PartnershipActionPayload } from '../lib/types/pipeline'

const STATUS_LABELS: Record<string, string> = {
  negotiating: '🤝 Negotiating',
  active:      '✅ Active',
  on_hold:     '⏸ On Hold',
  exited:      '🚪 Exited',
}

const STATUS_OPTIONS = ['negotiating', 'active', 'on_hold', 'exited']

function PartnershipRow({ partnership }: { partnership: EquityPartnership }) {
  const queryClient = useQueryClient()
  const [showActionForm, setShowActionForm] = useState(false)
  const [actionDesc, setActionDesc] = useState('')

  const completeMutation = useMutation({
    mutationFn: (actionId: string) => completePartnershipAction(partnership.id, actionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partnerships'] }),
  })

  const addActionMutation = useMutation({
    mutationFn: (payload: PartnershipActionPayload) => createPartnershipAction(partnership.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] })
      setActionDesc('')
      setShowActionForm(false)
    },
  })

  const nextAction = partnership.current_next_action

  return (
    <article style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 600, margin: 0 }}>{partnership.business_name}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.1rem 0' }}>
            {partnership.partner_name}
            {partnership.business_type ? ` · ${partnership.business_type}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>
            {partnership.equity_pct}%
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>
            {STATUS_LABELS[partnership.status] ?? partnership.status}
          </span>
        </div>
      </div>

      {nextAction ? (
        <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>→ {nextAction.description}</span>
          <button
            className="button-muted"
            style={{ fontSize: '0.72rem', padding: '1px 6px' }}
            disabled={completeMutation.isPending}
            onClick={() => completeMutation.mutate(nextAction.id)}
          >
            Mark done
          </button>
        </div>
      ) : (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>No next action set.</p>
      )}

      {showActionForm ? (
        <form
          style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem' }}
          onSubmit={e => { e.preventDefault(); addActionMutation.mutate({ description: actionDesc, is_current_next_action: true }) }}
        >
          <input
            value={actionDesc}
            onChange={e => setActionDesc(e.target.value)}
            placeholder="Next action…"
            required
            style={{ flex: 1, fontSize: '0.8rem' }}
          />
          <button type="submit" disabled={addActionMutation.isPending} style={{ fontSize: '0.78rem' }}>
            {addActionMutation.isPending ? '…' : 'Add'}
          </button>
          <button type="button" className="button-ghost" style={{ fontSize: '0.78rem' }} onClick={() => setShowActionForm(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <button
          className="button-ghost"
          style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}
          onClick={() => setShowActionForm(true)}
        >
          + Add next action
        </button>
      )}
    </article>
  )
}

export default function EquityPartnershipsPanel() {
  const queryClient = useQueryClient()
  const { data: partnerships, isLoading } = useQuery({
    queryKey: ['partnerships'],
    queryFn: listPartnerships,
  })

  const [showForm, setShowForm] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [equityPct, setEquityPct] = useState('')
  const [status, setStatus] = useState('negotiating')

  const createMutation = useMutation({
    mutationFn: (payload: EquityPartnershipPayload) => createPartnership(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] })
      setPartnerName(''); setBusinessName(''); setBusinessType(''); setEquityPct(''); setStatus('negotiating')
      setShowForm(false)
    },
  })

  return (
    <div>
      {isLoading && <p className="dim-text">Loading partnerships…</p>}
      {!isLoading && partnerships?.length === 0 && (
        <p className="dim-text" style={{ fontSize: '0.85rem' }}>No equity partnerships yet.</p>
      )}
      {partnerships?.map(p => <PartnershipRow key={p.id} partnership={p} />)}

      {showForm ? (
        <form
          className="form-grid"
          onSubmit={e => {
            e.preventDefault()
            createMutation.mutate({ partner_name: partnerName, business_name: businessName, business_type: businessType, equity_pct: equityPct, status })
          }}
          style={{ marginTop: '0.75rem' }}
        >
          <div className="field">
            <label>Partner name</label>
            <input value={partnerName} onChange={e => setPartnerName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Business name</label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Business type</label>
            <input value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. Perfumes retail" />
          </div>
          <div className="field">
            <label>Equity %</label>
            <input type="number" min="0" max="100" step="0.01" value={equityPct} onChange={e => setEquityPct(e.target.value)} required />
          </div>
          <div className="field span-2">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="field span-2 form-actions">
            <button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Add Partnership'}
            </button>
            <button type="button" className="button-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          + New Partnership
        </button>
      )}
    </div>
  )
}
