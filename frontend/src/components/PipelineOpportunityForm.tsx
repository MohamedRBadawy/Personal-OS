import { useState } from 'react'
import type { Opportunity, OpportunityPayload } from '../lib/types'

type PipelineOpportunityFormProps = {
  isSubmitting: boolean
  initialValue?: Opportunity | null
  onSubmit: (payload: OpportunityPayload) => void
}

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
  const [status, setStatus] = useState<Opportunity['status']>(initialValue?.status ?? 'new')
  const [dateFound, setDateFound] = useState(initialValue?.date_found ?? today)
  const [dateApplied, setDateApplied] = useState(initialValue?.date_applied ?? '')
  const [outcomeNotes, setOutcomeNotes] = useState(initialValue?.outcome_notes ?? '')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({
      name,
      platform,
      description,
      budget: budget || null,
      status,
      date_found: dateFound,
      date_applied: dateApplied || null,
      outcome_notes: outcomeNotes,
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
      <div className="field">
        <label htmlFor="pipeline-status">Status</label>
        <select
          id="pipeline-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as Opportunity['status'])}
        >
          {[
            ['new', 'New'],
            ['reviewing', 'Reviewing'],
            ['applied', 'Applied'],
            ['won', 'Won'],
            ['lost', 'Lost'],
            ['rejected', 'Rejected'],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
      <div className="field span-2">
        <label htmlFor="pipeline-description">Description</label>
        <textarea
          id="pipeline-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="field span-2">
        <label htmlFor="pipeline-outcome-notes">Outcome notes</label>
        <textarea
          id="pipeline-outcome-notes"
          value={outcomeNotes}
          onChange={(event) => setOutcomeNotes(event.target.value)}
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
