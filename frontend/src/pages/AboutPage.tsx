import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageSkeleton } from '../components/PageSkeleton'
import { getAIContext, getProfile, updateProfile } from '../lib/api'
import type { ProfileSection, UserProfile } from '../lib/types'

// ── Default sections ──────────────────────────────────────────────────────────

const DEFAULT_SECTION_TITLES = [
  'Family',
  'End Goals',
  'Skills & Strengths',
  'Known Weaknesses',
  'How I Think & Operate',
  'Current Situation',
  'What I\'m Recovering From',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(val: string | null | undefined, currency = 'EUR'): string {
  if (val == null || val === '') return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return `${n.toLocaleString()} ${currency}`
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—'
  return new Date(val + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Quick Facts Edit Modal ────────────────────────────────────────────────────

type FactsFormData = Pick<
  UserProfile,
  | 'full_name' | 'date_of_birth' | 'location' | 'personality_type' | 'religion'
  | 'weight_kg' | 'height_cm'
  | 'monthly_income' | 'income_currency' | 'monthly_expenses'
  | 'monthly_independent_income'
  | 'financial_target_monthly' | 'financial_target_currency'
  | 'total_debt' | 'debt_currency'
>

function QuickFactsModal({
  profile,
  onSave,
  onCancel,
  isPending,
}: {
  profile: UserProfile
  onSave: (data: Partial<UserProfile>) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState<FactsFormData>({
    full_name: profile.full_name,
    date_of_birth: profile.date_of_birth ?? '',
    location: profile.location,
    personality_type: profile.personality_type,
    religion: profile.religion,
    weight_kg: profile.weight_kg,
    height_cm: profile.height_cm,
    monthly_income: profile.monthly_income,
    income_currency: profile.income_currency,
    monthly_expenses: profile.monthly_expenses,
    monthly_independent_income: profile.monthly_independent_income,
    financial_target_monthly: profile.financial_target_monthly,
    financial_target_currency: profile.financial_target_currency,
    total_debt: profile.total_debt,
    debt_currency: profile.debt_currency,
  })

  function set<K extends keyof FactsFormData>(key: K, value: FactsFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSave() {
    const payload: Partial<UserProfile> = {
      ...form,
      date_of_birth: (form.date_of_birth as string) || null,
    }
    onSave(payload)
  }

  return (
    <div className="about-modal-overlay" onClick={onCancel}>
      <div className="about-modal" onClick={e => e.stopPropagation()}>
        <div className="about-modal-header">
          <h3 className="about-modal-title">Edit Quick Facts</h3>
          <button className="about-modal-close" onClick={onCancel} type="button">✕</button>
        </div>

        <div className="about-modal-body">
          <div className="about-form-section">
            <p className="about-form-section-label">Identity</p>
            <div className="about-form-row">
              <div className="about-form-field">
                <label className="about-label">Full Name</label>
                <input className="form-input" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
              </div>
              <div className="about-form-field">
                <label className="about-label">Personality Type</label>
                <input className="form-input" value={form.personality_type} onChange={e => set('personality_type', e.target.value)} placeholder="e.g. INTP" />
              </div>
            </div>
            <div className="about-form-row">
              <div className="about-form-field">
                <label className="about-label">Location</label>
                <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, Country" />
              </div>
              <div className="about-form-field">
                <label className="about-label">Religion</label>
                <input className="form-input" value={form.religion} onChange={e => set('religion', e.target.value)} placeholder="e.g. Islam" />
              </div>
            </div>
            <div className="about-form-row">
              <div className="about-form-field">
                <label className="about-label">Date of Birth</label>
                <input className="form-input" type="date" value={(form.date_of_birth as string) ?? ''} onChange={e => set('date_of_birth', e.target.value || null)} />
              </div>
              <div className="about-form-field about-form-field--half">
                <label className="about-label">Weight (kg)</label>
                <input className="form-input" type="number" step="0.1" value={form.weight_kg ?? ''} onChange={e => set('weight_kg', e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
              <div className="about-form-field about-form-field--half">
                <label className="about-label">Height (cm)</label>
                <input className="form-input" type="number" step="0.1" value={form.height_cm ?? ''} onChange={e => set('height_cm', e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
            </div>
          </div>

          <div className="about-form-section">
            <p className="about-form-section-label">Finances</p>
            <div className="about-form-row">
              <div className="about-form-field">
                <label className="about-label">Monthly Income</label>
                <input className="form-input" type="number" step="0.01" value={form.monthly_income ?? ''} onChange={e => set('monthly_income', e.target.value || null)} />
              </div>
              <div className="about-form-field about-form-field--currency">
                <label className="about-label">Currency</label>
                <input className="form-input" value={form.income_currency} onChange={e => set('income_currency', e.target.value)} maxLength={3} />
              </div>
            </div>
            <div className="about-form-row">
              <div className="about-form-field">
                <label className="about-label">Monthly Expenses</label>
                <input className="form-input" type="number" step="0.01" value={form.monthly_expenses ?? ''} onChange={e => set('monthly_expenses', e.target.value || null)} />
              </div>
            </div>
            <div className="about-form-row">
              <div className="about-form-field">
                <label className="about-label">Independent Income / mo</label>
                <input className="form-input" type="number" step="0.01" value={form.monthly_independent_income ?? ''} onChange={e => set('monthly_independent_income', e.target.value || null)} />
              </div>
            </div>
            <div className="about-form-row">
              <div className="about-form-field">
                <label className="about-label">Financial Target / mo</label>
                <input className="form-input" type="number" step="0.01" value={form.financial_target_monthly ?? ''} onChange={e => set('financial_target_monthly', e.target.value || null)} />
              </div>
              <div className="about-form-field about-form-field--currency">
                <label className="about-label">Currency</label>
                <input className="form-input" value={form.financial_target_currency} onChange={e => set('financial_target_currency', e.target.value)} maxLength={3} />
              </div>
            </div>
            <div className="about-form-row">
              <div className="about-form-field">
                <label className="about-label">Total Debt</label>
                <input className="form-input" type="number" step="0.01" value={form.total_debt ?? ''} onChange={e => set('total_debt', e.target.value || null)} />
              </div>
              <div className="about-form-field about-form-field--currency">
                <label className="about-label">Currency</label>
                <input className="form-input" value={form.debt_currency} onChange={e => set('debt_currency', e.target.value)} maxLength={3} />
              </div>
            </div>
          </div>
        </div>

        <div className="about-modal-footer">
          <button className="btn-ghost" onClick={onCancel} type="button" disabled={isPending}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} type="button" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  section,
  onSave,
  onDelete,
  isSaving,
}: {
  section: ProfileSection
  onSave: (id: number, title: string, content: string) => void
  onDelete: (id: number) => void
  isSaving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(section.title)
  const [content, setContent] = useState(section.content)

  function handleSave() {
    onSave(section.id, title, content)
    setEditing(false)
  }

  function handleCancel() {
    setTitle(section.title)
    setContent(section.content)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="about-section-card about-section-card--editing">
        <input
          className="form-input about-section-title-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Section title"
        />
        <textarea
          className="form-input about-section-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write anything about this area of your life…"
          rows={8}
        />
        <div className="about-section-actions">
          <button className="btn-ghost about-btn-danger" onClick={() => onDelete(section.id)} type="button" disabled={isSaving}>
            Delete
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={handleCancel} type="button" disabled={isSaving}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} type="button" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="about-section-card">
      <div className="about-section-header">
        <h3 className="about-section-title">{section.title}</h3>
        <button
          className="about-section-edit-btn"
          onClick={() => setEditing(true)}
          type="button"
          title="Edit section"
        >
          ✎
        </button>
      </div>
      {section.content ? (
        <p className="about-section-content">{section.content}</p>
      ) : (
        <p className="about-section-empty">Click ✎ to fill this in</p>
      )}
    </div>
  )
}

// ── Add Section Form ──────────────────────────────────────────────────────────

function AddSectionForm({
  onAdd,
  onCancel,
  isPending,
}: {
  onAdd: (title: string, content: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  return (
    <div className="about-section-card about-section-card--editing">
      <input
        className="form-input about-section-title-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Section title (e.g. Values, Fears, Long-term Vision…)"
        autoFocus
      />
      <textarea
        className="form-input about-section-textarea"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write anything about this area of your life…"
        rows={6}
      />
      <div className="about-section-actions">
        <button className="btn-ghost" onClick={onCancel} type="button" disabled={isPending}>Cancel</button>
        <button
          className="btn-primary"
          onClick={() => { if (title.trim()) onAdd(title.trim(), content) }}
          type="button"
          disabled={isPending || !title.trim()}
        >
          {isPending ? 'Adding…' : 'Add Section'}
        </button>
      </div>
    </div>
  )
}

// ── Quick Facts Card ──────────────────────────────────────────────────────────

function QuickFactsCard({
  profile,
  onEditClick,
}: {
  profile: UserProfile
  onEditClick: () => void
}) {
  const facts: { label: string; value: string }[] = [
    { label: 'Name', value: profile.full_name || '—' },
    { label: 'Personality', value: profile.personality_type || '—' },
    { label: 'Location', value: profile.location || '—' },
    { label: 'Religion', value: profile.religion || '—' },
    { label: 'Date of Birth', value: fmtDate(profile.date_of_birth) },
    { label: 'Weight', value: profile.weight_kg != null ? `${profile.weight_kg} kg` : '—' },
    { label: 'Height', value: profile.height_cm != null ? `${profile.height_cm} cm` : '—' },
  ]

  const finFacts: { label: string; value: string; accent?: boolean }[] = [
    { label: 'Employment Income', value: fmtCurrency(profile.monthly_income, profile.income_currency) },
    { label: 'Expenses / mo', value: fmtCurrency(profile.monthly_expenses, profile.income_currency) },
    {
      label: 'Independent Income',
      value: fmtCurrency(profile.monthly_independent_income, profile.financial_target_currency),
      accent: true,
    },
    {
      label: 'Financial Target',
      value: fmtCurrency(profile.financial_target_monthly, profile.financial_target_currency),
    },
    { label: 'Total Debt', value: fmtCurrency(profile.total_debt, profile.debt_currency) },
  ]

  // Calculate progress toward financial target
  const indep = parseFloat(profile.monthly_independent_income ?? '0') || 0
  const target = parseFloat(profile.financial_target_monthly ?? '1000') || 1000
  const progressPct = Math.min(100, Math.round((indep / target) * 100))

  return (
    <div className="about-facts-card">
      <div className="about-facts-header">
        <h3 className="about-facts-title">Quick Facts</h3>
        <button className="about-edit-btn" onClick={onEditClick} type="button">Edit</button>
      </div>

      <div className="about-facts-list">
        {facts.map(f => (
          <div key={f.label} className="about-fact-row">
            <span className="about-fact-label">{f.label}</span>
            <span className="about-fact-value">{f.value}</span>
          </div>
        ))}
      </div>

      <div className="about-finance-block">
        <p className="about-finance-heading">Financial Snapshot</p>
        {finFacts.map(f => (
          <div key={f.label} className="about-fact-row">
            <span className="about-fact-label">{f.label}</span>
            <span className={`about-fact-value${f.accent ? ' about-fact-value--accent' : ''}`}>{f.value}</span>
          </div>
        ))}

        <div className="about-progress-bar-wrap">
          <div className="about-progress-bar-track">
            <div className="about-progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="about-progress-label">
            {progressPct}% toward financial independence target
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AboutPage() {
  const queryClient = useQueryClient()
  const [editingFacts, setEditingFacts] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy AI Context')
  const [savingSectionId, setSavingSectionId] = useState<number | null>(null)

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data)
    },
  })

  const profile = profileQuery.data

  // Seed default sections on first load if none exist
  useEffect(() => {
    if (profile && profile.sections.length === 0) {
      const defaultSections = DEFAULT_SECTION_TITLES.map((title, idx) => ({
        title,
        content: '',
        order: idx,
      }))
      updateMutation.mutate({ sections: defaultSections as unknown as ProfileSection[] })
    }
    // Only run when profile data first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function handleCopyContext() {
    try {
      const { context } = await getAIContext()
      await navigator.clipboard.writeText(context)
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy AI Context'), 2500)
    } catch {
      setCopyLabel('Failed')
      setTimeout(() => setCopyLabel('Copy AI Context'), 2500)
    }
  }

  function handleFactsSave(data: Partial<UserProfile>) {
    updateMutation.mutate(data, {
      onSuccess: () => setEditingFacts(false),
    })
  }

  function handleSectionSave(id: number, title: string, content: string) {
    if (!profile) return
    setSavingSectionId(id)
    const newSections = profile.sections.map(s =>
      s.id === id ? { ...s, title, content } : s
    )
    updateMutation.mutate(
      { sections: newSections },
      { onSettled: () => setSavingSectionId(null) }
    )
  }

  function handleSectionDelete(id: number) {
    if (!profile) return
    const newSections = profile.sections.filter(s => s.id !== id)
    updateMutation.mutate({ sections: newSections })
  }

  function handleAddSection(title: string, content: string) {
    if (!profile) return
    const newSections = [
      ...profile.sections,
      { title, content, order: profile.sections.length } as ProfileSection,
    ]
    updateMutation.mutate({ sections: newSections }, {
      onSuccess: () => setAddingSection(false),
    })
  }

  if (profileQuery.isLoading) return <PageSkeleton />

  if (profileQuery.isError || !profile) {
    return <section className="error-state">Could not load profile.</section>
  }

  return (
    <section className="page about-page">
      {/* Header */}
      <div className="about-page-header">
        <div>
          <p className="eyebrow">Personal context</p>
          <h2>About Me</h2>
          <p className="muted">Your personal context — who you are, what you're building toward</p>
        </div>
        <button
          className="about-ai-ctx-btn"
          onClick={handleCopyContext}
          type="button"
        >
          {copyLabel}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="about-layout">
        {/* Left: Quick Facts */}
        <div className="about-col-left">
          <QuickFactsCard profile={profile} onEditClick={() => setEditingFacts(true)} />
        </div>

        {/* Right: Flexible Sections */}
        <div className="about-col-right">
          <div className="about-sections-list">
            {profile.sections.map(section => (
              <SectionCard
                key={section.id}
                section={section}
                onSave={handleSectionSave}
                onDelete={handleSectionDelete}
                isSaving={savingSectionId === section.id && updateMutation.isPending}
              />
            ))}

            {addingSection ? (
              <AddSectionForm
                onAdd={handleAddSection}
                onCancel={() => setAddingSection(false)}
                isPending={updateMutation.isPending}
              />
            ) : (
              <button
                className="about-add-section-btn"
                onClick={() => setAddingSection(true)}
                type="button"
              >
                + Add Section
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Facts Modal */}
      {editingFacts && (
        <QuickFactsModal
          profile={profile}
          onSave={handleFactsSave}
          onCancel={() => setEditingFacts(false)}
          isPending={updateMutation.isPending}
        />
      )}
    </section>
  )
}
