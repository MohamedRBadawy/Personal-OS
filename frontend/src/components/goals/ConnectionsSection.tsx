import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  listRoutineBlocksForNode, listHabitsForNode, listContactsForNode,
  listLearningItemsForNode, listMarketingActionsForNode,
} from '../../lib/api'
import type { Node } from '../../lib/types'

export function ConnectionsSection({ node }: { node: Node }) {
  const [open, setOpen] = useState(false)

  const routineQ   = useQuery({ queryKey: ['node-routine-blocks', node.id], queryFn: () => listRoutineBlocksForNode(node.id), enabled: open })
  const habitsQ    = useQuery({ queryKey: ['node-habits', node.id],         queryFn: () => listHabitsForNode(node.id).then(r => r.results),        enabled: open })
  const contactsQ  = useQuery({ queryKey: ['node-contacts', node.id],       queryFn: () => listContactsForNode(node.id).then(r => r.results),      enabled: open })
  const learningQ  = useQuery({ queryKey: ['node-learning', node.id],       queryFn: () => listLearningItemsForNode(node.id).then(r => r.results), enabled: open })
  const marketingQ = useQuery({ queryKey: ['node-marketing', node.id],      queryFn: () => listMarketingActionsForNode(node.id).then(r => r.results), enabled: open })

  const isLoading = routineQ.isLoading || habitsQ.isLoading || contactsQ.isLoading || learningQ.isLoading || marketingQ.isLoading
  const allEmpty = open && !isLoading
    && (routineQ.data?.length ?? 0) === 0
    && (habitsQ.data?.length ?? 0) === 0
    && (contactsQ.data?.length ?? 0) === 0
    && (learningQ.data?.length ?? 0) === 0
    && (marketingQ.data?.length ?? 0) === 0

  return (
    <div className="sp-connections">
      <button className="sp-connections-toggle" onClick={() => setOpen(o => !o)}>
        Connections {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="sp-connections-body">
          {isLoading && <p className="sp-conn-empty">Loading…</p>}
          {(routineQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Routine blocks</p>
              {routineQ.data!.map(b => (
                <div key={b.id} className="sp-conn-item">
                  <span>🕐</span><span>{b.label}</span>
                  <span className="sp-conn-meta">{b.time_str} · {b.duration_minutes}m</span>
                </div>
              ))}
            </div>
          )}
          {(habitsQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Supporting habits</p>
              {habitsQ.data!.map(h => (
                <div key={h.id} className="sp-conn-item">
                  <span>🔄</span><span>{h.name}</span>
                  <span className="sp-conn-meta">{h.target}</span>
                </div>
              ))}
            </div>
          )}
          {(contactsQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Linked contacts</p>
              {contactsQ.data!.map(c => (
                <div key={c.id} className="sp-conn-item">
                  <span>👤</span><span>{c.name}</span>
                  <span className="sp-conn-meta">{c.relation}</span>
                </div>
              ))}
            </div>
          )}
          {(learningQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Learning resources</p>
              {learningQ.data!.map(l => (
                <div key={l.id} className="sp-conn-item">
                  <span>📚</span><span>{l.title}</span>
                  <span className="sp-conn-meta">{l.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
          {(marketingQ.data?.length ?? 0) > 0 && (
            <div className="sp-conn-group">
              <p className="sp-conn-label">Marketing actions</p>
              {marketingQ.data!.map(m => (
                <div key={m.id} className="sp-conn-item">
                  <span>📣</span><span>{m.action}</span>
                  <span className="sp-conn-meta">{m.platform}</span>
                </div>
              ))}
            </div>
          )}
          {allEmpty && <p className="sp-conn-empty">No connections found.</p>}
        </div>
      )}
    </div>
  )
}
