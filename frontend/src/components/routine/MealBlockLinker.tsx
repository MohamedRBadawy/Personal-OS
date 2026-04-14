import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listMealPlans, saveMealLog, updateMealLog } from '../../lib/api'
import type { MealPlan } from '../../lib/types'

interface Props {
  date: string
  slot: string
}

const EAT_STATUS_OPTS = [
  { value: 'as_planned',      label: '✓ As planned'  },
  { value: 'ate_less',        label: '↓ Ate less'     },
  { value: 'ate_more',        label: '↑ Ate more'     },
  { value: 'ate_differently', label: '~ Different'    },
  { value: 'skipped',         label: '✗ Skipped'      },
]

export function MealBlockLinker({ date, slot }: Props) {
  const qc = useQueryClient()

  const { data: plans = [] } = useQuery<MealPlan[]>({
    queryKey: ['meal-plans', date],
    queryFn: () => listMealPlans(date),
    staleTime: 60_000,
  })

  const plan = plans.find(p => p.slot === slot) ?? null

  const logMut = useMutation({
    mutationFn: async (status: string) => {
      if (plan?.log?.id) {
        return updateMealLog(plan.log.id, { status: status as MealPlan['log'] extends null ? never : never })
      }
      return saveMealLog({ plan: plan?.id, date, slot, status })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans', date] }),
  })

  if (!plan) {
    return (
      <div className="meal-linker-empty">
        <Link to="/health?tab=meals" className="meal-linker-plan-link">
          + Plan your {slot} →
        </Link>
      </div>
    )
  }

  const macros = [
    plan.calories && `${plan.calories} kcal`,
    plan.protein_g && `${plan.protein_g}g protein`,
    plan.carbs_g && `${plan.carbs_g}g carbs`,
    plan.fat_g && `${plan.fat_g}g fat`,
  ].filter(Boolean)

  const currentStatus = plan.log?.status ?? null

  return (
    <div className="meal-linker">
      <div className="meal-linker-header">
        <span className="meal-linker-name">{plan.name}</span>
        {macros.length > 0 && (
          <span className="meal-linker-macros">{macros.join(' · ')}</span>
        )}
      </div>
      <div className="meal-linker-btns">
        {EAT_STATUS_OPTS.map(opt => (
          <button
            key={opt.value}
            className={`meal-linker-btn${currentStatus === opt.value ? ' active' : ''}`}
            disabled={logMut.isPending}
            onClick={() => logMut.mutate(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
