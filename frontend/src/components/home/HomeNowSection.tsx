// [AR] قسم "الآن" — رأس الصفحة والروتين اليومي والجدول الزمني والنبضات
// [EN] Now section — page header, routine quick panel, schedule, and pulse rows
// Connects to: /schedule, /daily, /focus, /health, /journal, /contacts, /business

import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { RoutineBlock, RoutineLogEntry } from '../../lib/types'
import type { CommandCenterPayload } from '../../lib/types'

interface NowSectionProps {
  routineBlocks: RoutineBlock[]
  todayLogs: RoutineLogEntry[]
  today: string
  onLog: (blockTime: string, status: string) => void
  logPending: boolean
  currentBlock: RoutineBlock | null
  checkinStatus: { morning_done: boolean; evening_done: boolean } | undefined
  badDayMode: boolean
  appSettings: { id: string | number; bad_day_mode: boolean } | undefined
  onToggleBadDay: () => void
  badDayMutating: boolean
  pipelineSummary: CommandCenterPayload['pipeline']['summary'] | undefined
  pipelineActiveCount: number
  journalStatus: { journaled_today: boolean; tomorrow_focus?: string }
  healthPulse: { avg_sleep_7d: number | null; avg_mood_7d: number | null; full_prayer_streak: number; health_logged_today: boolean } | null
  healthAlerts: string[]
  contactsDue: { count: number; top: { name: string }[] }
}

// [AR] لوحة تسجيل الروتين السريع — أزرار تسجيل الحالة لكل بلوك
// [EN] Routine quick panel — status log buttons per routine block
const RQP_STATUS_LABELS = [
  { value: 'done',    label: '✓' },
  { value: 'partial', label: '~' },
  { value: 'skipped', label: '✗' },
]

function RoutineQuickPanel({ blocks, logs, today: _today, onLog, pending }: {
  blocks: RoutineBlock[]
  logs: RoutineLogEntry[]
  today: string
  onLog: (blockTime: string, status: string) => void
  pending: boolean
}) {
  const logMap = new Map(logs.map(l => [l.block_time.slice(0, 5), l]))
  return (
    <div className="rqp-panel">
      {blocks.map(block => {
        const timeKey = block.time_str || block.time.slice(0, 5)
        const log = logMap.get(timeKey)
        return (
          <div key={block.id} className="rqp-row">
            <span className="rqp-time">{timeKey}</span>
            <span className="rqp-label">{block.label}</span>
            <div className="rqp-btns">
              {RQP_STATUS_LABELS.map(s => (
                <button key={s.value}
                  className={`rqp-btn${log?.status === s.value ? ` active-${s.value === 'skipped' ? 'skipped' : s.value}` : ''}`}
                  disabled={pending} title={s.value}
                  onClick={() => onLog(block.time, s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const HEALTH_ALERT_LABELS: Record<string, string> = {
  low_sleep: 'Low sleep', low_mood: 'Low mood', prayer_gap: 'Prayer gap',
}

export function HomeNowSection({
  routineBlocks, todayLogs, today, onLog, logPending,
  currentBlock, checkinStatus, badDayMode, appSettings,
  onToggleBadDay, badDayMutating, pipelineSummary, pipelineActiveCount,
  journalStatus, healthPulse, healthAlerts, contactsDue,
}: NowSectionProps) {
  const nowHour = new Date().getHours()
  const isMorning = nowHour >= 5 && nowHour < 12
  const [routineExpanded, setRoutineExpanded] = useState(isMorning)
  const hp = healthPulse
  const js = journalStatus
  const showMorningNudge = nowHour < 9 && checkinStatus && !checkinStatus.morning_done && !badDayMode
  const showEveningNudge = nowHour >= 20 && checkinStatus && !checkinStatus.evening_done && !badDayMode

  return (
    <>
      {/* [AR] رأس الصفحة — التاريخ ووضع اليوم الصعب */}
      {/* [EN] Page header — date display and bad-day mode toggle */}
      <div className="home-top-row">
        <p className="home-date">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div className="home-top-actions">
          {badDayMode && <span className="home-bad-day-chip">😔 Minimal day</span>}
          {appSettings && (
            <button type="button"
              className={`home-bad-day-btn${badDayMode ? ' active' : ''}`}
              onClick={onToggleBadDay} disabled={badDayMutating}
              title={badDayMode ? 'Exit minimal mode' : 'Activate minimal/bad day mode'}>
              {badDayMode ? '✓ Minimal mode' : '🌧 Bad day?'}
            </button>
          )}
          <Link to="/focus" className="home-focus-btn">⚡ Focus Mode</Link>
        </div>
      </div>

      {/* [AR] تنبيه تسجيل الدخول الصباحي أو المسائي */}
      {/* [EN] Morning or evening check-in nudge */}
      {(showMorningNudge || showEveningNudge) && (
        <Link to="/daily" className="home-checkin-nudge">
          <span className="home-checkin-nudge-icon">{showMorningNudge ? '🌅' : '🌙'}</span>
          <div className="home-checkin-nudge-text">
            <strong>{showMorningNudge ? 'Morning check-in' : 'Evening check-in'}</strong>
            <span className="caption">
              {showMorningNudge ? 'Start the day right — takes 2 minutes' : 'Close the day with intention'}
            </span>
          </div>
          <span className="home-checkin-nudge-cta">Start →</span>
        </Link>
      )}

      {/* [AR] قسم "اليوم" — الروتين والصحة واليوميات وجهات الاتصال */}
      {/* [EN] Today section — routine, health, journal, and contacts pulse rows */}
      <div className="home-section">
        <div className="home-section-header">
          <p className="home-section-title">Today</p>
          <Link to="/daily" className="home-section-link">Check-in →</Link>
        </div>

        <div className="pulse-row" style={{ cursor: 'default' }}>
          <Link to="/schedule" className="pulse-row-inner" style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
            <span className="pulse-icon">▦</span>
            <span className="pulse-label">Routine</span>
          </Link>
          <button className="rqp-toggle"
            onClick={e => { e.stopPropagation(); setRoutineExpanded(p => !p) }}
            title={routineExpanded ? 'Collapse' : 'Log blocks'}>
            {routineExpanded ? '▴ Close' : '▾ Log'}
          </button>
        </div>

        {routineExpanded && routineBlocks.length > 0 && (
          <RoutineQuickPanel blocks={routineBlocks} logs={todayLogs} today={today}
            onLog={onLog} pending={logPending} />
        )}

        {currentBlock && (
          <Link to="/schedule" className="home-current-block">
            <span className="home-current-now">● NOW</span>
            <strong>{currentBlock.label}</strong>
          </Link>
        )}

        {pipelineSummary && (pipelineActiveCount > 0 || pipelineSummary.due_follow_ups_count > 0) && (
          <Link to="/business" className={`pulse-row${pipelineSummary.due_follow_ups_count > 0 ? ' pulse-row--alert' : ''}`}>
            <span className="pulse-icon">🚀</span>
            <span className="pulse-label">Pipeline</span>
            {pipelineActiveCount > 0 && <span className="pulse-value">{pipelineActiveCount} active</span>}
            {pipelineSummary.due_follow_ups_count > 0 && (
              <span className="cc-followup-chip">
                {pipelineSummary.due_follow_ups_count} follow-up{pipelineSummary.due_follow_ups_count !== 1 ? 's' : ''} due
              </span>
            )}
          </Link>
        )}

        <Link to="/journal" className={`pulse-row${!js.journaled_today ? ' pulse-row--alert' : ''}`}>
          <span className="pulse-icon">✏</span>
          <span className="pulse-label">Journal</span>
          {js.journaled_today
            ? <span className="pulse-value pulse-value--ok">Done</span>
            : <span className="pulse-value pulse-value--warn">Not yet</span>}
          {js.tomorrow_focus && <span className="pulse-sub">Focus: {js.tomorrow_focus}</span>}
        </Link>

        <Link to="/health" className={`pulse-row${healthAlerts.length > 0 ? ' pulse-row--alert' : ''}`}>
          <span className="pulse-icon">❤</span>
          <span className="pulse-label">Health</span>
          {hp?.avg_sleep_7d != null && <span className="pulse-value">{hp.avg_sleep_7d}h sleep</span>}
          {hp?.avg_mood_7d != null && <span className="pulse-meta">· mood {hp.avg_mood_7d}/5</span>}
          {hp?.full_prayer_streak != null && hp.full_prayer_streak > 0 && (
            <span className="pulse-meta">· {hp.full_prayer_streak}d prayer</span>
          )}
          {healthAlerts.map(a => <span key={a} className="pulse-chip">{HEALTH_ALERT_LABELS[a]}</span>)}
          {hp && !hp.health_logged_today && <span className="pulse-chip">Log today</span>}
        </Link>

        {contactsDue.count > 0 && (
          <Link to="/contacts" className="pulse-row pulse-row--alert">
            <span className="pulse-icon">👥</span>
            <span className="pulse-label">Contacts</span>
            <span className="pulse-value pulse-value--warn">{contactsDue.count} follow-up{contactsDue.count !== 1 ? 's' : ''} due</span>
            <span className="pulse-sub">{contactsDue.top.map(c => c.name).join(', ')}</span>
          </Link>
        )}
      </div>
    </>
  )
}
