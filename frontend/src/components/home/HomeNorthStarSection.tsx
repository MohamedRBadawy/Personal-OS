// [AR] قسم النجمة الشمالية — الهدف الرئيسي ونسبة التقدم وشريط الإنجازات
// [EN] North star section — primary goal metric, readiness widget, milestones
// Connects to: /api/profile/north-star/ (NorthStarView), /api/core/readiness/ (ReadinessWidget)

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getNorthStar, getReadinessScore } from '../../lib/api'
import type { ReadinessScore } from '../../lib/api'

interface Milestone {
  label: string
  done: boolean
  next: boolean
}

interface HomeNorthStarSectionProps {
  milestones: Milestone[]
}

// [AR] أداة قراءة درجة الجاهزية — دائرة SVG تعرض النسبة المئوية
// [EN] Readiness widget — SVG ring showing user-configured readiness score
function ReadinessWidget() {
  const [expanded, setExpanded] = useState(false)
  const { data } = useQuery<ReadinessScore>({
    queryKey: ['readiness-score'],
    queryFn: getReadinessScore,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  if (!data) return null
  const score = Math.round(data.total_score)
  const pct = Math.min(score, 100)
  const color = pct >= 75 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : '#f59e0b'

  return (
    <div className="readiness-card" onClick={() => setExpanded(p => !p)}>
      <div className="readiness-main">
        <div className="readiness-score-wrap">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle
              cx="28" cy="28" r="24" fill="none" stroke={color} strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color} fontFamily="var(--mono)">
              {score}
            </text>
          </svg>
        </div>
        <div className="readiness-info">
          <p className="readiness-title">Readiness</p>
          <p className="readiness-subtitle">
            {score}/100
            {data.projected_date && (
              <span className="caption"> · on track for {new Date(data.projected_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
            )}
          </p>
        </div>
        <span className="readiness-expand">{expanded ? '▴' : '▾'}</span>
      </div>

      {expanded && (
        <div className="readiness-breakdown">
          {Object.entries(data.breakdown).map(([key, item]) => (
            <div key={key} className="readiness-dimension">
              <span className="readiness-dim-label">{item.label}</span>
              <div className="readiness-dim-bar-wrap">
                <div
                  className="readiness-dim-bar-fill"
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
              <span className="readiness-dim-score" style={{ fontFamily: 'var(--mono)' }}>
                {Math.round(item.score)}/{item.max}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function HomeNorthStarSection({ milestones }: HomeNorthStarSectionProps) {
  const { data: ns } = useQuery({
    queryKey: ['north-star'],
    queryFn: getNorthStar,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const current = parseFloat(ns?.current_amount ?? '0')
  const target = parseFloat(ns?.target_amount ?? '0')
  const pct = ns?.progress_percent ?? 0
  const currency = ns?.currency ?? 'EUR'
  const unit = ns?.unit ?? 'per month'
  const label = ns?.label ?? 'Monthly independent income'

  return (
    <>
      {/* [AR] شريط النجمة الشمالية — يعرض التقدم نحو الهدف الرئيسي */}
      {/* [EN] North star bar — progress toward primary configurable goal */}
      <div className="unlock-bar">
        <p className="unlock-eyebrow">{label}</p>
        <div className="unlock-numbers">
          <span className="unlock-current">{currency}{current}/{unit.replace('per ', '')}</span>
          <span className="unlock-sep"> / </span>
          <span className="unlock-target">{currency}{target} {unit} {ns?.configured ? '' : '(not set)'}</span>
        </div>
        <div className="unlock-track">
          <div className="unlock-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="unlock-sub">
          {pct === 0
            ? 'First outreach message → first client → first income'
            : `${pct}% of target reached`}
          {' · '}
          {ns?.configured
            ? <Link to="/finance" style={{ color: 'inherit', opacity: 0.7 }}>Finance →</Link>
            : <Link to="/profile" style={{ color: 'inherit', opacity: 0.7 }}>Set target →</Link>}
        </p>
      </div>

      <ReadinessWidget />

      {/* [AR] سلسلة الإنجازات — الخارطة المرحلية للأهداف الكبرى */}
      {/* [EN] Milestone chain — roadmap of major goals */}
      {milestones.length > 0 && (
        <div className="milestone-chain">
          {milestones.map((m, i) => (
            <div key={i} className={`milestone-row ${m.done ? 'done' : m.next ? 'next' : ''}`}>
              <span className="milestone-dot">{m.done ? '✓' : m.next ? '→' : '○'}</span>
              <span className="milestone-label">{m.label}</span>
              {m.next && <span className="milestone-badge">NEXT</span>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
