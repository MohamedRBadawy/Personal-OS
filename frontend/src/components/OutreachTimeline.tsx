// [AR] مخطط زمني لخطوات التواصل — يعرض سجل التواصل لكل فرصة
// [EN] Outreach timeline — displays the step history per opportunity

import { useState } from 'react'
import type { OutreachStep } from '../lib/types/pipeline'

const STEP_ICONS: Record<string, string> = {
  first_message:  '📤',
  reply_received: '📥',
  meeting_booked: '📅',
  proposal_sent:  '📄',
  won:            '🏆',
  lost:           '❌',
}

const STEP_LABELS: Record<string, string> = {
  first_message:  'First Message Sent',
  reply_received: 'Reply Received',
  meeting_booked: 'Meeting Booked',
  proposal_sent:  'Proposal Sent',
  won:            'Won',
  lost:           'Lost',
}

interface Props {
  steps: OutreachStep[]
  loading?: boolean
}

export default function OutreachTimeline({ steps, loading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) return <p className="dim-text" style={{ fontSize: '0.8rem' }}>Loading steps…</p>
  if (!steps.length) return <p className="dim-text" style={{ fontSize: '0.8rem' }}>No outreach steps yet.</p>

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {steps.map(step => (
        <li
          key={step.id}
          style={{ fontSize: '0.8rem', cursor: step.notes ? 'pointer' : 'default' }}
          onClick={() => step.notes && setExpandedId(expandedId === step.id ? null : step.id)}
        >
          <span style={{ marginRight: '0.4rem' }}>{STEP_ICONS[step.step_type] ?? '•'}</span>
          <span style={{ fontWeight: 500 }}>{STEP_LABELS[step.step_type] ?? step.step_type}</span>
          <span className="dim-text" style={{ marginLeft: '0.5rem' }}>{step.date}</span>
          {step.notes && (
            <span className="dim-text" style={{ marginLeft: '0.4rem' }}>
              {expandedId === step.id ? '▲' : '▼'}
            </span>
          )}
          {expandedId === step.id && step.notes && (
            <p style={{ marginTop: '0.25rem', paddingLeft: '1.4rem', color: 'var(--text-secondary)' }}>
              {step.notes}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
