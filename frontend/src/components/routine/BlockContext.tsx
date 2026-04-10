import type { RoutineBlock } from '../../lib/types'

export function BlockContext({ block, onEdit }: { block: RoutineBlock; onEdit: () => void }) {
  const hasDetails = !!(
    block.description || block.location || block.target ||
    block.exercise_type || block.intensity ||
    block.focus_area || block.deliverable ||
    block.days_of_week || block.linked_node_title
  )
  if (!hasDetails) return (
    <div className="routine-block-context routine-block-context-empty">
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No details added yet.</span>
      <button className="routine-ctx-edit-btn" onClick={onEdit}>✏ Add details</button>
    </div>
  )

  return (
    <div className="routine-block-context">
      <div className="routine-ctx-top">
        {block.description && (
          <p className="routine-ctx-description">{block.description}</p>
        )}
        <button className="routine-ctx-edit-btn" onClick={onEdit} title="Edit block details">
          ✏ Edit
        </button>
      </div>
      <div className="routine-ctx-chips">
        {block.type === 'spiritual' && block.location && (
          <span className="routine-ctx-chip ctx-spiritual">
            {block.location === 'mosque' ? '🕌' : block.location === 'home' ? '🏠' : '💻'} {block.location}
          </span>
        )}
        {block.type === 'spiritual' && block.target && (
          <span className="routine-ctx-chip ctx-spiritual">{block.target}</span>
        )}
        {block.type === 'health' && block.exercise_type && (
          <span className="routine-ctx-chip ctx-health">{block.exercise_type}</span>
        )}
        {block.type === 'health' && block.intensity && (
          <span className={`routine-ctx-chip ctx-intensity-${block.intensity}`}>
            {block.intensity === 'high' ? '🔴' : block.intensity === 'medium' ? '🟡' : '🟢'} {block.intensity}
          </span>
        )}
        {block.type === 'work' && block.focus_area && (
          <span className="routine-ctx-chip ctx-work">{block.focus_area.replace('_', ' ')}</span>
        )}
        {block.type === 'work' && block.deliverable && (
          <span className="routine-ctx-chip ctx-work" title="Deliverable">📋 {block.deliverable}</span>
        )}
        {block.days_of_week && (
          <span className="routine-ctx-chip ctx-days">
            📅 {block.days_of_week.split('').map(d =>
              ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][Number(d) - 1]
            ).join(' · ')} only
          </span>
        )}
        {block.linked_node_title && (
          <span className="routine-ctx-chip ctx-goal">
            🎯 {block.linked_node_title}
            {block.linked_node_progress != null && block.linked_node_progress > 0
              ? ` (${block.linked_node_progress}%)` : null}
          </span>
        )}
      </div>
    </div>
  )
}
