import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createReviewCommitments, generateWeeklyReview, getRoutineMetrics, listNodes, updateWeeklyReview } from '../lib/api'
import type { Node, ReviewCommitmentAction, ReviewCommitmentPayload, RoutineMetrics } from '../lib/types'

interface Props {
  onClose: () => void
  onDone: () => void
}

const STEPS = ['Wins', 'Challenges', 'Focus', 'Generate', 'Commitments']
const COMMITMENT_ACTIONS: Array<{ value: ReviewCommitmentAction; label: string }> = [
  { value: 'stop', label: 'STOP' },
  { value: 'change', label: 'CHANGE' },
  { value: 'start', label: 'START' },
]

export function WeeklyReviewModal({ onClose, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [wins, setWins] = useState('')
  const [challenges, setChallenges] = useState('')
  const [focusIds, setFocusIds] = useState<string[]>([])
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [generatedReport, setGeneratedReport] = useState('')
  const [commitments, setCommitments] = useState<ReviewCommitmentPayload[]>([])
  const [draftCommitments, setDraftCommitments] = useState<Record<ReviewCommitmentAction, string>>({
    stop: '',
    change: '',
    start: '',
  })
  const qc = useQueryClient()

  const { data: metrics } = useQuery<RoutineMetrics>({
    queryKey: ['routine-metrics'],
    queryFn: () => getRoutineMetrics(7),
  })
  const { data: nodes = [] } = useQuery<Node[]>({
    queryKey: ['nodes-v2'],
    queryFn: listNodes,
  })
  const activeNodes = nodes.filter(n => n.status === 'active' || n.status === 'available')

  const generateMut = useMutation({
    mutationFn: generateWeeklyReview,
    onSuccess: async (res) => {
      setGeneratedId(res.review.id)
      setGeneratedReport(res.review.ai_report)
      // Save the personal context as notes
      const notes = [
        wins ? `Wins:\n${wins}` : '',
        challenges ? `Challenges:\n${challenges}` : '',
        focusIds.length ? `Focus next week:\n${focusIds.map(id => nodes.find(n => n.id === id)?.title || id).join(', ')}` : '',
      ].filter(Boolean).join('\n\n')
      if (notes && res.review.id) {
        await updateWeeklyReview(res.review.id, { personal_notes: notes })
      }
      qc.invalidateQueries({ queryKey: ['weekly-reviews'] })
      qc.invalidateQueries({ queryKey: ['weekly-review-preview'] })
    },
  })
  const commitmentsMut = useMutation({
    mutationFn: ({ reviewId, items }: { reviewId: string; items: ReviewCommitmentPayload[] }) =>
      createReviewCommitments(reviewId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['command-center'] })
      qc.invalidateQueries({ queryKey: ['weekly-reviews'] })
    },
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggleFocus(id: string) {
    setFocusIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  function handleGenerate() {
    generateMut.mutate()
  }

  function addCommitment(action_type: ReviewCommitmentAction) {
    const description = draftCommitments[action_type].trim()
    if (!description) return
    setCommitments(current => [...current, { action_type, description }])
    setDraftCommitments(current => ({ ...current, [action_type]: '' }))
  }

  async function handleDone() {
    if (generatedId && commitments.length > 0) {
      await commitmentsMut.mutateAsync({ reviewId: generatedId, items: commitments })
    }
    onDone()
    onClose()
  }

  return createPortal(
    <div className="wr-overlay" onClick={onClose}>
      <div className="wr-modal" onClick={e => e.stopPropagation()}>
        {/* Progress */}
        <div className="wr-progress">
          {STEPS.map((s, i) => (
            <div key={s} className={`wr-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <span className="wr-step-dot">{i < step ? '✓' : i + 1}</span>
              <span className="wr-step-label">{s}</span>
            </div>
          ))}
        </div>

        {/* Step 0 — Wins */}
        {step === 0 && (
          <div className="wr-body">
            <h3 className="wr-title">What went well this week?</h3>
            <p className="wr-sub">Capture your wins, progress, and anything you're proud of.</p>
            <textarea
              className="form-input wr-textarea"
              rows={5}
              placeholder="e.g. Sent first outreach email, completed all morning prayers, finished the Marketing Hub feature…"
              value={wins}
              onChange={e => setWins(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Step 1 — Challenges */}
        {step === 1 && (
          <div className="wr-body">
            <h3 className="wr-title">What was hard or missed?</h3>
            {metrics && (
              <div className="wr-metrics">
                <span>🙏 Prayer: <strong>{Math.round(metrics.prayer_rate)}%</strong></span>
                <span>💪 Exercise: <strong>{Math.round(metrics.exercise_rate)}%</strong></span>
              </div>
            )}
            <textarea
              className="form-input wr-textarea"
              rows={5}
              placeholder="e.g. Missed exercise 3 days, didn't follow up with client, late nights…"
              value={challenges}
              onChange={e => setChallenges(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Step 2 — Focus next week */}
        {step === 2 && (
          <div className="wr-body">
            <h3 className="wr-title">What are your top 3 focuses next week?</h3>
            <p className="wr-sub">Select up to 3 goals or projects to lock in as priorities.</p>
            <div className="wr-node-list">
              {activeNodes.map(n => (
                <label key={n.id} className={`wr-node-item ${focusIds.includes(n.id) ? 'selected' : ''} ${!focusIds.includes(n.id) && focusIds.length >= 3 ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={focusIds.includes(n.id)}
                    disabled={!focusIds.includes(n.id) && focusIds.length >= 3}
                    onChange={() => toggleFocus(n.id)}
                  />
                  <span>{n.title}</span>
                  <span className="wr-node-status">{n.status}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Generate */}
        {step === 3 && (
          <div className="wr-body">
            <h3 className="wr-title">Generate your weekly review</h3>
            {!generatedId && !generateMut.isPending && (
              <>
                <p className="wr-sub">
                  The AI will analyze this week's data — routine, finances, goals — and generate a summary.
                </p>
                {(wins || challenges || focusIds.length > 0) && (
                  <div className="wr-summary">
                    {wins && <p><strong>Wins:</strong> {wins.slice(0, 80)}{wins.length > 80 ? '…' : ''}</p>}
                    {challenges && <p><strong>Challenges:</strong> {challenges.slice(0, 80)}{challenges.length > 80 ? '…' : ''}</p>}
                    {focusIds.length > 0 && (
                      <p><strong>Focus:</strong> {focusIds.map(id => nodes.find(n => n.id === id)?.title).join(', ')}</p>
                    )}
                  </div>
                )}
                <button className="btn-primary" onClick={handleGenerate}>
                  Generate review →
                </button>
              </>
            )}
            {generateMut.isPending && <p className="wr-loading">Generating… this may take a moment.</p>}
            {generatedId && generatedReport && (
              <div className="wr-generated">
                <p className="wr-generated-label">Weekly review saved</p>
                <div className="wr-report">{generatedReport.slice(0, 400)}{generatedReport.length > 400 ? '…' : ''}</div>
              </div>
            )}
            {generateMut.isError && <p className="wr-error">Generation failed — try again.</p>}
          </div>
        )}

        {/* Step 4 - Commitments */}
        {step === 4 && (
          <div className="wr-body">
            <h3 className="wr-title">What are you committing to?</h3>
            <p className="wr-sub">Turn the review into stop, change, and start promises for next week.</p>
            <div className="wr-commitment-groups">
              {COMMITMENT_ACTIONS.map(action => (
                <div className="wr-commitment-group" key={action.value}>
                  <label className="wr-commitment-label" htmlFor={`commitment-${action.value}`}>{action.label}</label>
                  <div className="wr-commitment-row">
                    <input
                      id={`commitment-${action.value}`}
                      className="form-input"
                      value={draftCommitments[action.value]}
                      onChange={e => setDraftCommitments(current => ({ ...current, [action.value]: e.target.value }))}
                      placeholder={`${action.label.toLowerCase()} one pattern or behavior`}
                    />
                    <button className="btn-ghost" type="button" onClick={() => addCommitment(action.value)}>Add</button>
                  </div>
                </div>
              ))}
            </div>
            {commitments.length > 0 && (
              <ul className="wr-commitment-list">
                {commitments.map((item, index) => (
                  <li key={`${item.action_type}-${index}`}>
                    <strong>{item.action_type.toUpperCase()}</strong>
                    <span>{item.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="wr-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <div style={{ flex: 1 }} />
          {step > 0 && !generatedId && (
            <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
          )}
          {step < 3 && (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>
              Next →
            </button>
          )}
          {step === 3 && generatedId && (
            <button className="btn-primary" onClick={() => setStep(4)}>
              Next →
            </button>
          )}
          {step === 4 && (
            <button className="btn-primary" disabled={commitmentsMut.isPending} onClick={handleDone}>
              Done ✓
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
