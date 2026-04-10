import { useQuery } from '@tanstack/react-query'
import { getRoutineNotes } from '../../lib/api'
import type { NoteEntry } from './constants'

export function BlockNotesHistory({ blockTime }: { blockTime: string }) {
  const { data = [], isLoading } = useQuery<NoteEntry[]>({
    queryKey: ['routine-notes', blockTime],
    queryFn: () => getRoutineNotes(blockTime, 5),
    staleTime: 2 * 60 * 1000,
  })

  if (isLoading) return null

  return (
    <div className="block-notes-history">
      <div className="block-notes-title">Past notes</div>
      {data.length === 0 ? (
        <p className="block-notes-empty">No notes logged yet.</p>
      ) : (
        data.map((entry, i) => (
          <div key={i} className="block-note-entry">
            <div className="block-note-meta">
              <span className="block-note-date">
                {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span className={`block-note-status note-status-${entry.status}`}>{entry.status}</span>
            </div>
            <span className="block-note-text">{entry.note}</span>
          </div>
        ))
      )}
    </div>
  )
}
