// [AR] لوحة محاسبة الالتزامات — تغلق حلقة المراجعة الأسبوعية السابقة
// [EN] Commitment accountability panel — closes the loop from the prior weekly review
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateReviewCommitment } from '../../lib/api'
import type { PriorCommitmentItem } from '../../lib/types'

type Props = {
  commitments: PriorCommitmentItem[]
}

export function CommitmentAccountabilityPanel({ commitments }: Props) {
  const [remaining, setRemaining] = useState(commitments)
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, was_kept }: { id: string; was_kept: boolean }) =>
      updateReviewCommitment(id, { was_kept }),
    onSuccess: (_data, variables) => {
      setRemaining(items => items.filter(item => item.id !== variables.id))
      qc.invalidateQueries({ queryKey: ['command-center'] })
    },
  })

  useEffect(() => {
    setRemaining(commitments)
  }, [commitments])

  if (remaining.length === 0) {
    return null
  }

  return (
    <section className="commitment-accountability" aria-label="Prior commitments">
      <div className="commitment-accountability-header">
        <span className="commitment-accountability-kicker">Did you keep this?</span>
        <strong>Prior review commitments</strong>
      </div>
      <div className="commitment-accountability-list">
        {remaining.map(item => (
          <article className="commitment-accountability-item" key={item.id}>
            <div>
              <span className={`commitment-action commitment-action--${item.action_type}`}>{item.action_type}</span>
              <p>{item.description}</p>
              <small>From week {item.from_week}</small>
            </div>
            <div className="commitment-accountability-actions">
              <button
                className="btn-ghost"
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: item.id, was_kept: false })}
              >
                No
              </button>
              <button
                className="btn-primary"
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: item.id, was_kept: true })}
              >
                Yes
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
