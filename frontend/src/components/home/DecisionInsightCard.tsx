// [AR] بطاقة توتر القرار - تكشف عندما يعود هدف تم إبعاده ليصبح نشطاً
// [EN] Decision tension card - surfaces when a deprioritized goal becomes active again

import { useQuery } from '@tanstack/react-query'
import { listDueDecisions } from '../../lib/api'

type DecisionInsightCardProps = {
  activeNodeIds: string[]
}

export function DecisionInsightCard({ activeNodeIds }: DecisionInsightCardProps) {
  const activeSet = new Set(activeNodeIds)
  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions-due'],
    queryFn: listDueDecisions,
    staleTime: 5 * 60 * 1000,
  })
  const tension = decisions.find(decision => decision.killed_node && activeSet.has(decision.killed_node))

  if (!tension) return null

  return (
    <div className="decision-insight-card">
      <span className="decision-insight-label">Decision tension</span>
      <p>
        You decided <strong>{tension.decision}</strong>
        {tension.killed_node_title ? <> which deprioritized <strong>{tension.killed_node_title}</strong></> : null},
        but that work is now active.
      </p>
    </div>
  )
}
