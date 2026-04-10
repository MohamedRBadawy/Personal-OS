import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoutineBlock, updateRoutineBlock } from '../../lib/api'
import type { RoutineBlock, Node } from '../../lib/types'
import { TYPE_COLORS, DAYS } from './constants'
import type { BlockType } from './constants'
import { toggleDay } from './helpers'

interface BlockEditPanelProps {
  block: RoutineBlock | null
  linkableNodes: Node[]
  onClose: () => void
  onSaved: () => void
}

export function BlockEditPanel({ block, linkableNodes, onClose, onSaved }: BlockEditPanelProps) {
  const [label, setLabel] = useState(block?.label ?? '')
  const [time, setTime] = useState(block?.time_str ?? '08:00')
  const [type, setType] = useState<BlockType>(block?.type ?? 'work')
  const [importance, setImportance] = useState<'must' | 'should' | 'nice'>(block?.importance ?? 'should')
  const [durationMinutes, setDurationMinutes] = useState(block?.duration_minutes ?? 30)
  const [isFixed, setIsFixed] = useState(block?.is_fixed ?? false)
  const [linkedNode, setLinkedNode] = useState<string | null>(block?.linked_node ?? null)
  const [description, setDescription] = useState(block?.description ?? '')
  const [daysOfWeek, setDaysOfWeek] = useState(block?.days_of_week ?? '')
  // Spiritual
  const [location, setLocation] = useState(block?.location ?? '')
  const [target, setTarget] = useState(block?.target ?? '')
  // Health
  const [exerciseType, setExerciseType] = useState(block?.exercise_type ?? '')
  const [intensity, setIntensity] = useState(block?.intensity ?? '')
  // Work
  const [focusArea, setFocusArea] = useState(block?.focus_area ?? '')
  const [deliverable, setDeliverable] = useState(block?.deliverable ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!label.trim()) { setError('Label is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const payload: Partial<RoutineBlock> = {
        label: label.trim(), time, type, importance,
        duration_minutes: durationMinutes, is_fixed: isFixed,
        linked_node: linkedNode,
        description, days_of_week: daysOfWeek,
        location, target,
        exercise_type: exerciseType, intensity,
        focus_area: focusArea, deliverable,
      }
      if (block) {
        await updateRoutineBlock(block.id, payload)
      } else {
        await createRoutineBlock({ ...payload, active: true, order: 9999 })
      }
      onSaved()
    } catch {
      setError('Save failed — check your inputs.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel bep-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="side-panel-header">
          <span className="side-panel-icon" style={{ color: TYPE_COLORS[type], fontSize: 18 }}>◉</span>
          <h3 className="side-panel-title">{block ? block.label || 'Edit block' : 'New block'}</h3>
          <button className="side-panel-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="side-panel-body">

          {/* Core fields */}
          <div className="sp-field">
            <label className="sp-label">Label</label>
            <input className="form-input" value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Block label…" autoFocus />
          </div>

          <div className="sp-row">
            <div className="sp-field">
              <label className="sp-label">Start time</label>
              <input className="form-input" type="time" value={time}
                onChange={e => setTime(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label">Duration (min)</label>
              <input className="form-input" type="number" min={5} max={720}
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))} />
            </div>
          </div>

          <div className="sp-row">
            <div className="sp-field">
              <label className="sp-label">Type</label>
              <select className="form-input" value={type}
                onChange={e => setType(e.target.value as BlockType)}>
                <option value="spiritual">🕌 Spiritual</option>
                <option value="health">💪 Health</option>
                <option value="work">💼 Work</option>
                <option value="personal">🧘 Personal</option>
                <option value="family">👨‍👩‍👧 Family</option>
              </select>
            </div>
            <div className="sp-field">
              <label className="sp-label">Commitment</label>
              <label className="bep-toggle-row">
                <input type="checkbox" checked={isFixed}
                  onChange={e => setIsFixed(e.target.checked)} />
                <span style={{ color: isFixed ? 'var(--text)' : 'var(--text-muted)' }}>
                  {isFixed ? 'Fixed (committed)' : 'Flexible'}
                </span>
              </label>
            </div>
          </div>

          {/* Importance */}
          <div className="sp-field">
            <label className="sp-label">Importance</label>
            <div className="bep-importance-row">
              {(['must', 'should', 'nice'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  className={`bep-importance-btn importance-${level}${importance === level ? ' active' : ''}`}
                  onClick={() => setImportance(level)}
                >
                  {level === 'must' ? '🔴 Must' : level === 'should' ? '🟡 Should' : '🟢 Nice'}
                </button>
              ))}
            </div>
            <p className="sp-hint-inline" style={{ marginTop: 4 }}>
              {importance === 'must' ? 'Non-negotiable — weights 3× in your core score'
                : importance === 'should' ? 'Regular habit — weights 2× in your core score'
                : 'Bonus — skipping isn\'t failure (1× weight)'}
            </p>
          </div>

          {/* Days of week */}
          <div className="sp-field">
            <label className="sp-label">
              Days active{' '}
              <span className="sp-hint-inline">
                {daysOfWeek === '' ? '(every day)' : `(${daysOfWeek.split('').map(d => DAYS.find(x => x.digit === d)?.label).join(', ')})`}
              </span>
            </label>
            <div className="bep-day-chips">
              {DAYS.map(d => (
                <button
                  key={d.digit}
                  type="button"
                  className={`bep-day-chip${daysOfWeek.includes(d.digit) ? ' active' : ''}`}
                  onClick={() => setDaysOfWeek(prev => toggleDay(prev, d.digit))}
                >
                  {d.label}
                </button>
              ))}
              {daysOfWeek !== '' && (
                <button type="button" className="btn-ghost-sm" style={{ fontSize: 11 }}
                  onClick={() => setDaysOfWeek('')}>
                  every day
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="sp-field">
            <label className="sp-label">Description / notes</label>
            <textarea className="form-input" rows={2} value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Why this block exists…" />
          </div>

          {/* Spiritual-specific */}
          {type === 'spiritual' && (
            <div className="bep-type-section bep-type-spiritual">
              <div className="bep-type-header">Spiritual details</div>
              <div className="sp-row">
                <div className="sp-field">
                  <label className="sp-label">Location</label>
                  <select className="form-input" value={location}
                    onChange={e => setLocation(e.target.value)}>
                    <option value="">— any —</option>
                    <option value="mosque">🕌 Mosque</option>
                    <option value="home">🏠 Home</option>
                    <option value="online">💻 Online</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label">Target / goal</label>
                  <input className="form-input" value={target}
                    onChange={e => setTarget(e.target.value)}
                    placeholder="1 juz, adhkar…" />
                </div>
              </div>
            </div>
          )}

          {/* Health-specific */}
          {type === 'health' && (
            <div className="bep-type-section bep-type-health">
              <div className="bep-type-header">Health details</div>
              <div className="sp-row">
                <div className="sp-field">
                  <label className="sp-label">Exercise type</label>
                  <select className="form-input" value={exerciseType}
                    onChange={e => setExerciseType(e.target.value)}>
                    <option value="">— any —</option>
                    <option value="cardio">Cardio</option>
                    <option value="strength">Strength</option>
                    <option value="yoga">Yoga</option>
                    <option value="hiit">HIIT</option>
                    <option value="swimming">Swimming</option>
                    <option value="cycling">Cycling</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label">Intensity</label>
                  <select className="form-input" value={intensity}
                    onChange={e => setIntensity(e.target.value)}>
                    <option value="">— any —</option>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Work-specific */}
          {type === 'work' && (
            <div className="bep-type-section bep-type-work">
              <div className="bep-type-header">Work details</div>
              <div className="sp-row">
                <div className="sp-field">
                  <label className="sp-label">Focus area</label>
                  <select className="form-input" value={focusArea}
                    onChange={e => setFocusArea(e.target.value)}>
                    <option value="">— any —</option>
                    <option value="deep_work">Deep work</option>
                    <option value="email">Email / comms</option>
                    <option value="calls">Calls / meetings</option>
                    <option value="admin">Admin</option>
                    <option value="outreach">Outreach</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label">Deliverable</label>
                  <input className="form-input" value={deliverable}
                    onChange={e => setDeliverable(e.target.value)}
                    placeholder="Expected output…" />
                </div>
              </div>
            </div>
          )}

          {/* Linked goal */}
          <div className="sp-field">
            <label className="sp-label">Linked goal / project</label>
            <select className="form-input"
              value={linkedNode ?? ''}
              onChange={e => setLinkedNode(e.target.value || null)}>
              <option value="">— no link —</option>
              {linkableNodes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Footer */}
        <div className="side-panel-footer">
          {error && <span style={{ fontSize: 12, color: '#dc2626' }}>{error}</span>}
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !label.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
