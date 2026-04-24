// [AR] نموذج تسجيل خطوة تواصل — يسمح بإضافة خطوة جديدة لفرصة محددة
// [EN] Outreach step form — adds a new step to an opportunity's timeline

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOutreachStep } from '../lib/api'
import type { OutreachStepPayload } from '../lib/types/pipeline'

const STEP_OPTIONS = [
  { value: 'first_message',  label: '📤 First Message Sent' },
  { value: 'reply_received', label: '📥 Reply Received' },
  { value: 'meeting_booked', label: '📅 Meeting Booked' },
  { value: 'proposal_sent',  label: '📄 Proposal Sent' },
  { value: 'won',            label: '🏆 Won' },
  { value: 'lost',           label: '❌ Lost' },
]

interface Props {
  opportunityId: string
}

export default function OutreachStepForm({ opportunityId }: Props) {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const [stepType, setStepType] = useState('first_message')
  const [date, setDate] = useState(today)
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: OutreachStepPayload) => createOutreachStep(opportunityId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-steps', opportunityId] })
      setNotes('')
      setDate(today)
      setStepType('first_message')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ step_type: stepType as OutreachStepPayload['step_type'], date, notes })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <select
          value={stepType}
          onChange={e => setStepType(e.target.value)}
          style={{ flex: 1, minWidth: 160, fontSize: '0.8rem' }}
        >
          {STEP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          style={{ fontSize: '0.8rem', width: 130 }}
        />
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        style={{ fontSize: '0.8rem', resize: 'vertical' }}
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        style={{ alignSelf: 'flex-start', fontSize: '0.8rem' }}
      >
        {mutation.isPending ? 'Saving…' : 'Log Step'}
      </button>
      {mutation.isError && (
        <p style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>Failed to save step.</p>
      )}
    </form>
  )
}
