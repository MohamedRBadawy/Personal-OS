/**
 * HealthSignalsPanel — plain-English health signals derived from direction data.
 *
 * Replaces the abstract pillar-score dashboard. Each signal is a single sentence
 * that tells Mohamed what's actually happening, not a number out of 100.
 */

import type { HealthDirection, HealthDirectionPillar } from '../../lib/types'

// ── Signal type ───────────────────────────────────────────────────────────────

type SignalLevel = 'green' | 'amber' | 'red'

interface Signal {
  level: SignalLevel
  icon: string
  domain: string
  message: string
}

// ── Per-pillar signal builders ────────────────────────────────────────────────

function pillarSignal(pillar: HealthDirectionPillar): Signal | null {
  const d = pillar.details as Record<string, unknown>
  const level: SignalLevel = pillar.score >= 70 ? 'green' : pillar.score >= 40 ? 'amber' : 'red'
  const icon = level === 'green' ? '✅' : level === 'amber' ? '🟡' : '⚠️'

  switch (pillar.id) {
    case 'recovery': {
      const avg = d.avg_sleep_hours as number | undefined
      const target = d.target_sleep_hours as number | undefined
      if (!avg || !target) return null
      const diff = +(target - avg).toFixed(1)
      const msg = diff > 0.5
        ? `Sleep: ${avg}h average — ${diff}h below your ${target}h target`
        : diff < -0.3
        ? `Sleep: ${avg}h average — above your ${target}h target`
        : `Sleep: ${avg}h average — on target`
      return { level, icon, domain: 'Sleep & Recovery', message: msg }
    }

    case 'performance_body': {
      const sessions = d.session_count as number | undefined
      const target = d.target_sessions as number | undefined
      if (sessions == null || target == null) return null
      const msg = sessions >= target
        ? `Training: ${sessions} sessions in the last fortnight — target met`
        : sessions === 0
        ? `Training: no sessions logged yet — muscles are ready`
        : `Training: ${sessions} of ${target} target sessions — ${target - sessions} to go`
      return { level, icon, domain: 'Training', message: msg }
    }

    case 'nutrition': {
      const protein = d.avg_daily_protein_g as number | undefined
      const proteinTarget = d.target_protein_g as number | undefined
      const consistency = d.meal_consistency_pct as number | undefined
      // Only show if there's actual nutrition data
      if (!protein && consistency == null) return null
      let msg = ''
      if (protein && proteinTarget) {
        const diff = proteinTarget - protein
        msg = diff > 10
          ? `Nutrition: ${protein}g protein daily — ${diff}g below your ${proteinTarget}g target`
          : `Nutrition: ${protein}g protein daily — close to your ${proteinTarget}g target`
      } else if (consistency != null) {
        msg = `Nutrition: meals logged ${Math.round(consistency)}% of days`
      }
      return { level, icon, domain: 'Nutrition', message: msg }
    }

    case 'mood': {
      const avg = d.avg_mood_14d as number | undefined
      const streak = d.low_mood_streak as number | undefined
      if (avg == null) return null
      const base = `Mood: ${avg}/5 average this fortnight`
      const extra = streak && streak > 2
        ? ` — ${streak}-day low-mood streak, notice what's different`
        : avg >= 3.5
        ? ' — positive'
        : avg < 2.5
        ? ' — on the low side'
        : ''
      return { level, icon, domain: 'Mood', message: base + extra }
    }

    case 'habits': {
      const rate = d.completion_rate_pct as number | undefined
      const count = d.health_habit_count as number | undefined
      if (rate == null || count == null || count === 0) return null
      const helping = (d.helping_items as string[])?.length ?? 0
      const hurting = (d.hurting_items as string[])?.length ?? 0
      let msg = `Habits: ${Math.round(rate)}% completion`
      if (helping > 0 && hurting > 0) msg += ` — ${helping} strong, ${hurting} need work`
      else if (helping > 0) msg += ` — ${helping} habits consistently done`
      else if (hurting > 0) msg += ` — ${hurting} habits consistently missed`
      return { level, icon, domain: 'Habits', message: msg }
    }

    case 'spiritual': {
      const pct = d.prayer_completion_pct as number | undefined
      const gap = d.prayer_gap_streak as number | undefined
      if (pct == null) return null
      const roundedPct = Math.round(pct)
      const base = `Prayers: ${roundedPct}% completion this fortnight`
      const extra = gap && gap > 1
        ? ` — ${gap}-day gap active, get back on track`
        : roundedPct >= 85
        ? ' — strong and consistent'
        : roundedPct >= 60
        ? ' — room to improve'
        : ' — needs attention'
      return { level, icon, domain: 'Spiritual', message: base + extra }
    }

    default:
      return null
  }
}

// ── Styling constants ─────────────────────────────────────────────────────────

const LEVEL_BG: Record<SignalLevel, string> = {
  green: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
  amber: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
  red:   'color-mix(in srgb, var(--color-error) 10%, transparent)',
}
const LEVEL_COLOR: Record<SignalLevel, string> = {
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  red:   'var(--color-error)',
}
const TREND_LABEL: Record<string, string> = {
  improving: '↑ Improving',
  stable:    '→ Stable',
  declining: '↓ Declining',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  direction: HealthDirection
}

export function HealthSignalsPanel({ direction }: Props) {
  // Not enough data yet
  if (direction.confidence < 20) {
    return (
      <div className="health-signals-panel health-signals-empty">
        <p className="eyebrow" style={{ marginBottom: 6 }}>Health signals</p>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
          Keep logging — your personalised health signals will appear after a few days of data across sleep, mood, prayer, and habits.
        </p>
      </div>
    )
  }

  const signals = direction.pillars
    .map(pillarSignal)
    .filter((s): s is Signal => s !== null)

  const focus = direction.next_actions[0] ?? null

  return (
    <div className="health-signals-panel">
      <div className="health-signals-header">
        <p className="eyebrow">This fortnight</p>
        <span className={`health-signals-trend health-signals-trend--${direction.trend}`}>
          {TREND_LABEL[direction.trend] ?? direction.trend}
        </span>
      </div>

      <div className="health-signals-list">
        {signals.map((s, i) => (
          <div
            key={i}
            className="health-signal-row"
            style={{ background: LEVEL_BG[s.level], borderLeft: `3px solid ${LEVEL_COLOR[s.level]}` }}
          >
            <span className="health-signal-icon">{s.icon}</span>
            <div className="health-signal-body">
              <span className="health-signal-domain" style={{ color: LEVEL_COLOR[s.level] }}>{s.domain}</span>
              <span className="health-signal-message">{s.message.replace(/^[^:]+: /, '')}</span>
            </div>
          </div>
        ))}
      </div>

      {focus && (
        <div className="health-signals-focus">
          <p className="eyebrow" style={{ marginBottom: 6, fontSize: 10 }}>Focus this week</p>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{focus}</p>
        </div>
      )}
    </div>
  )
}
