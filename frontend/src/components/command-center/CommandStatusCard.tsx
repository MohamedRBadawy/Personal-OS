import { Link } from 'react-router-dom'
import { formatCurrency, titleCase } from '../../lib/formatters'
import type { CommandCenterStatusCard as CommandCenterStatusCardType } from '../../lib/types'

export function CommandStatusCard({ card }: { card: CommandCenterStatusCardType }) {
  const variant = card.status === 'warning' ? 'warning' : card.status === 'attention' ? 'active' : 'success'
  const value = card.id === 'finance' ? formatCurrency(card.value) : `${card.value}`
  const total = card.id === 'finance' ? formatCurrency(card.total) : `${card.total}`

  return (
    <Link className="command-status-card" to={card.route}>
      <div className="command-status-card__header">
        <p className="eyebrow">{card.label}</p>
        <span className={`status-pill ${variant}`}>{titleCase(card.status)}</span>
      </div>
      <strong>
        {value}
        <span className="command-status-card__total">/ {total}</span>
      </strong>
      <p className="muted">{card.detail}</p>
    </Link>
  )
}
