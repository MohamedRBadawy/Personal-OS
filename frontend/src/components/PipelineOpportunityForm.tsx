import { useState } from 'react'
import type { Opportunity, OpportunityPayload, OpportunityStatus } from '../lib/types'

type PipelineOpportunityFormProps = {
  isSubmitting: boolean
  initialValue?: Opportunity | null
  onSubmit: (payload: OpportunityPayload) => void
}

const STATUSES: { value: OpportunityStatus; label: string }[] = [
  { value: 'new',           label: 'New' },
  { value: 'reviewing',     label: 'Reviewing' },
  { value: 'applied',       label: 'Applied' },
  { value: 'interview',     label: 'Interview' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'won',           label: 'Won' },
  { value: 'lost',          label: 'Lost' },
  { value: 'rejected',      label: 'Rejected' },
]

export function PipelineOpportunityForm({
  isSubmitting,
  initialValue,
  onSubmit,
}: PipelineOpportunityFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [name, setName] = useState(initialValue?.name ?? '')
  const [platform, setPlatform] = useState(initialValue?.platform ?? 'Upwork')
  const [description, setDescription] = useState(initialValue?.description ?? '')
  const [budget, setBudget] = useState(initialValue?.budget ?? '')
  const [status, setStatus] = useState<OpportunityStatus>(initialValue?.status ?? 'new')
  const [jobUrl, setJobUrl] = useState(initialValue?.job_url ?? '')
  const [clientName, setClientName] = useState(initialValue?.client_name ?? '')
  const [dateFound, setDateFound] = useState(initialValue?.date_found ?? today)
  const [dateApplied, setDateApplied] = useState(initialValue?.date_applied ?? '')
  const [outcomeNotes, setOutcomeNotes] = useState(initialValue?.outcome_notes ?? '')
  const [prospectContext, setProspectContext] = useState(initialValue?.prospect_context ?? '')
  const [monthlyValueEur, setMonthlyValueEur] = useState(String(initialValue?.monthly_value_eur ?? '0'))
  const [isRecurring, setIsRecurring] = useState(initialValue?.is_recurring ?? true)
  const [expectedCloseDate, setExpectedCloseDate] = useState(initialValue?.expected_close_date ?? '')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      name,
      platform,
      description,
      budget: budget || null,
      status,
      job_url: jobUrl || undefined,
      client_name: clientName || undefined,
      date_found: dateFound,
      date_applied: dateApplied || null,
      outcome_notes: outcomeNotes,
      prospect_context: prospectContext || undefined,
      monthly_value_eur: Number(monthlyValueEur || 0),
      is_recurring: isRecurring,
      expected_close_date: expectedCloseDate || null,
    })
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field span-2">
        <label htmlFor="pipeline-name">Opportunity name</label>
        <input
          id="pipeline-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pipeline-client">Client name</label>
        <input
          id="pipeline-client"
          placeholder="Who posted or who's the client"
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pipeline-platform">Platform</label>
        <select
          id="pipeline-platform"
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
        >
          {['Upwork', 'Freelancer', 'Referral', 'Direct', 'Other'].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="field span-2">
        <label htmlFor="pipeline-job-url">Job listing URL</label>
        <input
          id="pipeline-job-url"
          type="url"
          placeholder="https://…"
          value={jobUrl}
          onChange={(event) => setJobUrl(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pipeline-status">Status</label>
        <select
          id="pipeline-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as OpportunityStatus)}
        >
          {STATUSES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pipeline-budget">Budget (EUR)</label>
        <input
          id="pipeline-budget"
          min="0"
          step="0.01"
          type="number"
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pipeline-date-found">Date found</label>
        <input
          id="pipeline-date-found"
          required
          type="date"
          value={dateFound}
          onChange={(event) => setDateFound(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pipeline-date-applied">Date applied</label>
        <input
          id="pipeline-date-applied"
          type="date"
          value={dateApplied}
          onChange={(event) => setDateApplied(event.target.value)}
        />
      </div>
      <div className="field span-2">
        <label htmlFor="pipeline-description">Description</label>
        <textarea
          id="pipeline-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pipeline-monthly-value">Monthly value (EUR)</label>
        <input
          id="pipeline-monthly-value"
          min="0"
          step="0.01"
          type="number"
          value={monthlyValueEur}
          onChange={(e) => setMonthlyValueEur(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="pipeline-close-date">Expected close date</label>
        <input
          id="pipeline-close-date"
          type="date"
          value={expectedCloseDate}
          onChange={(e) => setExpectedCloseDate(e.target.value)}
        />
      </div>
      <div className="field span-2">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          Recurring monthly engagement
        </label>
      </div>
      <div className="field span-2">
        <label htmlFor="pipeline-outcome-notes">Outcome notes</label>
        <textarea
          id="pipeline-outcome-notes"
          value={outcomeNotes}
          onChange={(event) => setOutcomeNotes(event.target.value)}
        />
      </div>
      <div className="field span-2">
        <label htmlFor="pipeline-prospect-context">Prospect context <span className="field-hint">(for AI drafting)</span></label>
        <textarea
          id="pipeline-prospect-context"
          placeholder="Notes about this prospect — industry, pain points, tone preference…"
          rows={2}
          value={prospectContext}
          onChange={(event) => setProspectContext(event.target.value)}
        />
      </div>
      <div className="field span-2 form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving opportunity...' : initialValue ? 'Update opportunity' : 'Add opportunity'}
        </button>
      </div>
    </form>
  )
}
