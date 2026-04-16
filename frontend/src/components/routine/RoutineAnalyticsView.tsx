import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRoutineAnalytics } from '../../lib/api'
import type { RoutineBlock, RoutineDailyEntry, RoutineTypeStats, RoutineBlockStat, PrayerBlockStat, ExerciseBlockStat } from '../../lib/types'
import { TYPE_INFO, DAY_DIGITS, DAY_SHORT } from './constants'
import { heatLevel } from './helpers'

// ── Completion Heatmap ─────────────────────────────────────────────────────

function CompletionHeatmap({ daily }: { daily: RoutineDailyEntry[] }) {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = new Date(sorted[0]?.date + 'T00:00:00')
  const firstDow = (firstDate.getDay() + 6) % 7  // 0 = Mon

  const padded: (RoutineDailyEntry | null)[] = [...Array(firstDow).fill(null), ...sorted]
  const weeks: (RoutineDailyEntry | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

  return (
    <div className="ra-heatmap-wrap">
      <div className="ra-heatmap-days">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="ra-heatmap-day-label">{d}</span>
        ))}
      </div>
      <div className="ra-heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} className="ra-heatmap-week">
            {week.map((day, di) => (
              <div
                key={di}
                className={`ra-heatmap-cell${day ? ` heat-${heatLevel(day.pct)}` : ' heat-empty'}`}
                title={day
                  ? `${day.date}: ${day.pct}% — ✓${day.done} ~${day.partial} ⏰${day.late} ✕${day.skipped}`
                  : ''}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Status Breakdown ───────────────────────────────────────────────────────

function StatusBreakdown({ daily, totalBlocks }: { daily: RoutineDailyEntry[]; totalBlocks: number }) {
  const last30 = [...daily]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .reverse()
  const tb = totalBlocks || 1

  return (
    <div className="ra-breakdown">
      {last30.map(d => {
        const label = new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        const isToday = d.date === new Date().toLocaleDateString('en-CA')
        return (
          <div key={d.date} className={`ra-breakdown-row${isToday ? ' ra-today' : ''}`}>
            <span className="ra-breakdown-label">{label}</span>
            <div className="ra-stacked-bar">
              {d.done    > 0 && <div className="ra-seg ra-seg-done"    style={{ width: `${d.done/tb*100}%`    }} title={`Done: ${d.done}`} />}
              {d.partial > 0 && <div className="ra-seg ra-seg-partial" style={{ width: `${d.partial/tb*100}%` }} title={`Partial: ${d.partial}`} />}
              {d.late    > 0 && <div className="ra-seg ra-seg-late"    style={{ width: `${d.late/tb*100}%`    }} title={`Late: ${d.late}`} />}
              {d.skipped > 0 && <div className="ra-seg ra-seg-skipped" style={{ width: `${d.skipped/tb*100}%` }} title={`Skipped: ${d.skipped}`} />}
            </div>
            <span className="ra-breakdown-pct">{d.pct > 0 ? `${d.pct}%` : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Type Cards ─────────────────────────────────────────────────────────────

function TypeCards({ byType }: { byType: Record<string, RoutineTypeStats> }) {
  const entries = Object.entries(byType).sort((a, b) => b[1].rate - a[1].rate)
  return (
    <div className="ra-type-cards">
      {entries.map(([type, stats]) => {
        const info = TYPE_INFO[type] ?? { label: type, icon: '●', color: '#6b7280' }
        return (
          <div key={type} className="ra-type-card">
            <div className="ra-type-card-top">
              <span className="ra-type-icon">{info.icon}</span>
              <span className="ra-type-label">{info.label}</span>
              <span className="ra-type-rate" style={{ color: info.color }}>{stats.rate}%</span>
            </div>
            <div className="ra-type-bar-bg">
              <div className="ra-type-bar-fill" style={{ width: `${stats.rate}%`, background: info.color }} />
            </div>
            <div className="ra-type-counts">
              <span className="ra-count-done">✓ {stats.done}</span>
              <span className="ra-count-partial">~ {stats.partial}</span>
              <span className="ra-count-late">⏰ {stats.late}</span>
              <span className="ra-count-skipped">✕ {stats.skipped}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Block Stats Table ──────────────────────────────────────────────────────

function BlockStatsTable({ blockStats }: { blockStats: RoutineBlockStat[] }) {
  const [sortBy, setSortBy] = useState<'rate' | 'done' | 'skipped' | 'late'>('rate')
  const sorted = [...blockStats].sort((a, b) => {
    if (sortBy === 'rate') return a.rate - b.rate
    if (sortBy === 'done') return b.done - a.done
    if (sortBy === 'skipped') return b.skipped - a.skipped
    if (sortBy === 'late') return b.late - a.late
    return 0
  })

  function SortBtn({ col, label }: { col: typeof sortBy; label: string }) {
    return (
      <button
        className={`ra-sort-btn${sortBy === col ? ' active' : ''}`}
        onClick={() => setSortBy(col)}
      >{label}</button>
    )
  }

  return (
    <div className="ra-block-table-wrap">
      <div className="ra-sort-row">
        Sort: <SortBtn col="rate" label="% rate" /> <SortBtn col="done" label="done" />
        <SortBtn col="skipped" label="skipped" /> <SortBtn col="late" label="late" />
      </div>
      <div className="ra-block-table">
        {sorted.map(bs => {
          const info = TYPE_INFO[bs.type] ?? { color: '#6b7280' }
          return (
            <div key={bs.block_id} className="ra-block-row">
              <span className="ra-block-time">{bs.time_str}</span>
              <span className="ra-block-dot" style={{ background: info.color }} />
              <span className="ra-block-label">{bs.label}</span>
              <div className="ra-block-mini-bar-bg">
                <div
                  className="ra-block-mini-bar-fill"
                  style={{
                    width: `${bs.rate}%`,
                    background: bs.rate >= 80 ? '#16a34a' : bs.rate >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <span className="ra-block-rate-num">{bs.rate}%</span>
              <div className="ra-block-counts">
                <span className="ra-count-done">✓{bs.done}</span>
                <span className="ra-count-partial">~{bs.partial}</span>
                <span className="ra-count-late">⏰{bs.late}</span>
                <span className="ra-count-skipped">✕{bs.skipped}</span>
              </div>
              {bs.avg_drift_minutes !== null && (
                <span className={`ra-drift ${bs.avg_drift_minutes > 15 ? 'ra-drift-late' : bs.avg_drift_minutes < -5 ? 'ra-drift-early' : 'ra-drift-ok'}`}>
                  {bs.avg_drift_minutes > 0 ? `+${bs.avg_drift_minutes}` : bs.avg_drift_minutes}m
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Weekday Heatmap ────────────────────────────────────────────────────────

function WeekdayHeatmap({ byWeekday }: { byWeekday: Record<string, Record<string, number>> }) {
  const typeOrder = ['spiritual', 'health', 'work', 'personal', 'family']
  const types = typeOrder.filter(t => byWeekday[t])
  if (types.length === 0) return null

  return (
    <div className="ra-weekday-grid">
      {/* Header */}
      <div className="ra-weekday-header-row">
        <span className="ra-weekday-type-label" />
        {DAY_SHORT.map(d => (
          <span key={d} className="ra-weekday-day-header">{d}</span>
        ))}
      </div>
      {/* Type rows */}
      {types.map(type => {
        const info = TYPE_INFO[type] ?? { icon: '●', label: type, color: '#6b7280' }
        const wdRates = byWeekday[type] || {}
        return (
          <div key={type} className="ra-weekday-row">
            <span className="ra-weekday-type-label">
              <span style={{ marginRight: 5 }}>{info.icon}</span>{info.label}
            </span>
            {DAY_DIGITS.map(d => {
              const rate = wdRates[d] ?? 0
              const level = heatLevel(rate)
              return (
                <span
                  key={d}
                  className={`ra-weekday-cell heat-${level}`}
                  title={`${info.label} on ${DAY_SHORT[Number(d) - 1]}: ${rate}%`}
                >
                  <span className="ra-weekday-pct">{rate > 0 ? `${rate}` : ''}</span>
                </span>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Time Investment Summary ────────────────────────────────────────────────

function TimeInvestmentSummary({ blocks }: { blocks: RoutineBlock[] }) {
  const byType: Record<string, number> = {}
  for (const b of blocks) byType[b.type] = (byType[b.type] || 0) + b.duration_minutes
  const totalMins = Object.values(byType).reduce((s, v) => s + v, 0)

  function fmtM(m: number) {
    if (m >= 60) return `${(m / 60).toFixed(1).replace('.0', '')}h`
    return `${m}m`
  }

  return (
    <div className="ra-time-invest">
      {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, mins]) => {
        const info = TYPE_INFO[type] ?? { icon: '●', label: type, color: '#6b7280' }
        return (
          <span key={type} className="ra-time-invest-item">
            <span style={{ color: info.color, fontSize: 15 }}>{info.icon}</span>
            <strong className="ra-time-invest-val">{fmtM(mins)}</strong>
            <span className="ra-time-invest-label">{info.label}</span>
          </span>
        )
      })}
      <span className="ra-time-invest-item ra-time-invest-total">
        <span style={{ fontWeight: 700, fontSize: 14 }}>Σ</span>
        <strong className="ra-time-invest-val">{fmtM(totalMins)}</strong>
        <span className="ra-time-invest-label">/ day</span>
      </span>
    </div>
  )
}

// ── Prayer Quality Stats ───────────────────────────────────────────────────

function PrayerQualityStats({ stats }: { stats: PrayerBlockStat[] }) {
  if (!stats.length) return <p className="ra-section-sub">No prayer data yet.</p>

  const rows: { key: keyof PrayerBlockStat; label: string; alwaysShow?: boolean }[] = [
    { key: 'mosque_pct',         label: '🕌 Masjid' },
    { key: 'first_row_pct',      label: '1st Row' },
    { key: 'takbir_pct',         label: 'Takbirat Al-Ihram' },
    { key: 'sunnah_pct',         label: 'Sunnah' },
    { key: 'salah_adhkar_pct',   label: '📿 Adhkar Al-Salah' },
    { key: 'morning_adhkar_pct', label: '🤲 Morning Adhkar' },
    { key: 'evening_adhkar_pct', label: '🌙 Evening Adhkar' },
  ]

  return (
    <div className="ra-prayer-grid">
      {stats.map(ps => {
        const nKey = (key: string) => key.replace('_pct', '_n') as keyof PrayerBlockStat
        // Only show rows that have at least 1 log or are relevant to this prayer
        const relevantRows = rows.filter(r => {
          if (r.key === 'morning_adhkar_pct') return ps.morning_adhkar_n > 0 || ps.mosque_n > 0
          if (r.key === 'evening_adhkar_pct') return ps.evening_adhkar_n > 0 || ps.mosque_n > 0
          return true
        })
        return (
          <div key={ps.block_id} className="ra-prayer-card">
            <div className="ra-prayer-card-header">
              <span className="ra-prayer-time">{ps.time_str}</span>
              <span className="ra-prayer-label">{ps.label}</span>
              <span className="ra-prayer-logged">{ps.logged}× logged</span>
            </div>
            {ps.logged === 0 ? (
              <p className="ra-prayer-no-data">No logs in this window</p>
            ) : (
              <div className="ra-prayer-rows">
                {relevantRows.map(({ key, label }) => {
                  const pct = ps[key] as number
                  const n = ps[nKey(key as string)] as number
                  if (n === 0 && pct === 0 && key !== 'salah_adhkar_pct') {
                    // skip untracked fields silently if never set
                    if (key === 'morning_adhkar_pct' || key === 'evening_adhkar_pct') return null
                  }
                  return (
                    <div key={key} className="ra-prayer-row">
                      <span className="ra-prayer-row-label">{label}</span>
                      <div className="ra-prayer-bar-bg">
                        <div
                          className="ra-prayer-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="ra-prayer-pct" title={`${n} / ${ps.logged}`}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Exercise Quality Stats ─────────────────────────────────────────────────

function ExerciseStats({ stats }: { stats: ExerciseBlockStat[] }) {
  if (!stats.length) return <p className="ra-section-sub">No exercise blocks found.</p>
  return (
    <div className="ra-exercise-list">
      {stats.map(es => (
        <div key={es.block_id} className="ra-exercise-row">
          <span className="ra-exercise-time">{es.time_str}</span>
          <span className="ra-exercise-label">{es.label}</span>
          {es.exercise_type && (
            <span className="ra-exercise-badge">{es.exercise_type}</span>
          )}
          {es.intensity && (
            <span className={`ra-exercise-badge ra-intensity-${es.intensity}`}>{es.intensity}</span>
          )}
          <span className="ra-exercise-logged">{es.logged}× logged</span>
        </div>
      ))}
    </div>
  )
}

// ── Routine Analytics View (main export) ──────────────────────────────────

export function RoutineAnalyticsView({ blocks }: { blocks: RoutineBlock[] }) {
  const [days, setDays] = useState(90)
  const { data, isLoading } = useQuery({
    queryKey: ['routine-analytics', days],
    queryFn: () => getRoutineAnalytics(days),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="ra-page">

      {/* Lookback selector */}
      <div className="ra-controls">
        <span className="ra-controls-label">Lookback:</span>
        {([30, 60, 90] as const).map(d => (
          <button
            key={d}
            className={`btn-ghost-sm${days === d ? ' active' : ''}`}
            onClick={() => setDays(d)}
          >{d} days</button>
        ))}
      </div>

      {isLoading || !data ? (
        <p style={{ padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>Loading analytics…</p>
      ) : (
        <>
          {/* ── Heatmap ── */}
          <div className="ra-section">
            <div className="ra-section-head">
              <h3 className="ra-section-title">Completion heatmap</h3>
              <div className="ra-heatmap-legend">
                <span className="ra-legend-label">Less</span>
                <span className="ra-heatmap-cell heat-0" />
                <span className="ra-heatmap-cell heat-1" />
                <span className="ra-heatmap-cell heat-2" />
                <span className="ra-heatmap-cell heat-3" />
                <span className="ra-legend-label">More</span>
              </div>
            </div>
            <CompletionHeatmap daily={data.daily} />
          </div>

          {/* ── Time investment ── */}
          <div className="ra-section">
            <h3 className="ra-section-title">Scheduled time / day</h3>
            <TimeInvestmentSummary blocks={blocks} />
          </div>

          {/* ── By type ── */}
          <div className="ra-section">
            <h3 className="ra-section-title">Completion by type</h3>
            <TypeCards byType={data.by_type} />
          </div>

          {/* ── Weekday heatmap ── */}
          {data.by_weekday && Object.keys(data.by_weekday).length > 0 && (
            <div className="ra-section">
              <h3 className="ra-section-title">Performance by day of week</h3>
              <p className="ra-section-sub">Completion rate per type per weekday — reveals patterns like "always skip Sunday."</p>
              <WeekdayHeatmap byWeekday={data.by_weekday} />
            </div>
          )}

          {/* ── Status breakdown ── */}
          <div className="ra-section">
            <div className="ra-section-head">
              <h3 className="ra-section-title">Daily breakdown — last 30 days</h3>
              <div className="ra-bar-legend">
                <span className="ra-bar-legend-dot" style={{ background: '#16a34a' }} />Done
                <span className="ra-bar-legend-dot" style={{ background: '#2563eb' }} />Partial
                <span className="ra-bar-legend-dot" style={{ background: '#f59e0b' }} />Late
                <span className="ra-bar-legend-dot" style={{ background: '#ef4444' }} />Skipped
              </div>
            </div>
            <StatusBreakdown daily={data.daily} totalBlocks={blocks.length || 1} />
          </div>

          {/* ── Block consistency ── */}
          <div className="ra-section">
            <h3 className="ra-section-title">Block consistency — {days} days</h3>
            <p className="ra-section-sub">Sorted worst → best by default. Drift = avg minutes early/late vs scheduled time.</p>
            <BlockStatsTable blockStats={data.block_stats} />
          </div>

          {/* ── Prayer quality ── */}
          {data.prayer_stats?.length > 0 && (
            <div className="ra-section">
              <h3 className="ra-section-title">Prayer quality — {days} days</h3>
              <p className="ra-section-sub">Of prayers you logged as done/partial, what % included each quality marker.</p>
              <PrayerQualityStats stats={data.prayer_stats} />
            </div>
          )}

          {/* ── Exercise details ── */}
          {data.exercise_stats?.length > 0 && (
            <div className="ra-section">
              <h3 className="ra-section-title">Exercise blocks</h3>
              <p className="ra-section-sub">Your scheduled exercise blocks and how often you complete them.</p>
              <ExerciseStats stats={data.exercise_stats} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
