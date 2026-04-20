// [AR] قسم الحالة — لمحة المالية ونظرة عامة على الأهداف
// [EN] Status section — finance snapshot and goals overview
// Connects to: /finance, /goals

import { Link } from 'react-router-dom'
import { CollapsibleSection } from '../CollapsibleSection'
import type { DashboardV2 } from '../../lib/types'

interface HomeStatusSectionProps {
  data: DashboardV2
  surplusEgp: number
}

function formatK(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

export function HomeStatusSection({ data, surplusEgp }: HomeStatusSectionProps) {
  const fd = data.finance_detail

  return (
    <>
      {/* [AR] لمحة المالية — الفائض والديون وهدف الادخار */}
      {/* [EN] Finance snapshot — surplus, debt, savings target */}
      <CollapsibleSection title="Finance" storageKey="home-finance" defaultOpen={true}>
        <div className="home-section">
          <div className="home-section-header">
            <p className="home-section-title">Finance</p>
            <Link to="/finance" className="home-section-link">Details →</Link>
          </div>
          <Link to="/finance" className="finance-snapshot">
            <div className="finance-snap-grid">
              <div className="finance-snap-item">
                <span className="finance-snap-value">~{formatK(surplusEgp)} EGP</span>
                <span className="finance-snap-label">Monthly surplus</span>
              </div>
              {fd.savings_pct !== null && fd.savings_target_egp > 0 && (
                <div className="finance-snap-item">
                  <span className="finance-snap-value">{fd.savings_pct}%</span>
                  <span className="finance-snap-label">Savings target</span>
                </div>
              )}
              {fd.total_debt_egp > 0 && (
                <div className="finance-snap-item finance-snap-item--warn">
                  <span className="finance-snap-value">{formatK(fd.total_debt_egp)} EGP</span>
                  <span className="finance-snap-label">Total debt</span>
                </div>
              )}
            </div>
          </Link>
        </div>
      </CollapsibleSection>

      {/* [AR] نظرة عامة على الأهداف — عداد حالات الأهداف */}
      {/* [EN] Goals overview — count by status */}
      <CollapsibleSection title="Goals" storageKey="home-goals" defaultOpen={true}>
        <div className="home-section">
          <div className="home-section-header">
            <p className="home-section-title">Goals</p>
            <Link to="/goals" className="home-section-link">All goals →</Link>
          </div>
          <div className="stat-grid">
            {[
              { label: 'Active',    value: data.node_counts.active,    to: '/goals?status=active' },
              { label: 'Available', value: data.node_counts.available, to: '/goals?status=available' },
              { label: 'Blocked',   value: data.node_counts.blocked,   to: '/goals?status=blocked' },
              { label: 'Done',      value: data.node_counts.done,      to: '/goals?status=done' },
            ].map(card => (
              <Link key={card.label} to={card.to} className="stat-card">
                <span className="stat-value">{card.value}</span>
                <span className="stat-label">{card.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </CollapsibleSection>
    </>
  )
}
