// [AR] نافذة المقايضة - تجعل تكلفة تفعيل هدف جديد مرئية قبل الحفظ
// [EN] Trade-off modal - makes the cost of activating another goal visible before saving

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateNode } from '../../lib/api'
import type { ActiveGoalContext } from '../../lib/types'

type TradeoffPromptModalProps = {
  context: ActiveGoalContext
  targetNodeId: string
  targetTitle: string
  onClose: () => void
  onComplete?: () => void
}

export function TradeoffPromptModal({
  context,
  targetNodeId,
  targetTitle,
  onClose,
  onComplete,
}: TradeoffPromptModalProps) {
  const queryClient = useQueryClient()
  const [deferredGoalId, setDeferredGoalId] = useState('')
  const mutation = useMutation({
    mutationFn: async (deferOne: boolean) => {
      if (deferOne && deferredGoalId) {
        await updateNode(deferredGoalId, { status: 'deferred' })
      }
      return updateNode(targetNodeId, { status: 'active' })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['command-center'] }),
        queryClient.invalidateQueries({ queryKey: ['nodes'] }),
        queryClient.invalidateQueries({ queryKey: ['nodes-v2'] }),
      ])
      onComplete?.()
      onClose()
    },
  })

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel tradeoff-modal" onClick={event => event.stopPropagation()}>
        <h3 className="modal-title">Activate with a trade-off</h3>
        <p className="muted">{context.recommendation}</p>
        <p className="tradeoff-target">New active goal: <strong>{targetTitle}</strong></p>

        <div className="tradeoff-active-list">
          {context.active_goals.map(goal => (
            <label key={goal.id} className="tradeoff-active-row">
              <input
                type="radio"
                name="deferred-goal"
                value={goal.id}
                checked={deferredGoalId === goal.id}
                onChange={() => setDeferredGoalId(goal.id)}
              />
              <span>
                <strong>{goal.title}</strong>
                <small>{goal.progress_pct}% progress · unlocks {goal.dependency_unblock_count}</small>
              </span>
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-ghost"
            disabled={mutation.isPending || !deferredGoalId}
            onClick={() => mutation.mutate(true)}
          >
            Defer selected
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(false)}
          >
            Proceed anyway
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
