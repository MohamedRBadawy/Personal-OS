import type { ReactNode } from 'react'
import type { HealthDirectionPillar } from '../../lib/types'

type HealthImpactCardProps = {
  pillar: HealthDirectionPillar
  title?: string
  description?: string
  extra?: ReactNode
}

const TREND_LABEL: Record<HealthDirectionPillar['trend'], string> = {
  improving: 'Improving',
  stable: 'Stable',
  declining: 'Declining',
}

export function HealthImpactCard({ pillar, title, description, extra }: HealthImpactCardProps) {
  return (
    <section className={`health-impact-card health-impact-card--${pillar.status}`}>
      <div className="health-impact-card__header">
        <div>
          <p className="health-impact-card__eyebrow">{title ?? `${pillar.label} impact`}</p>
          <h3 className="health-impact-card__title">{pillar.label}</h3>
          {description ? <p className="health-impact-card__description">{description}</p> : null}
        </div>
        <div className="health-impact-card__score">
          <strong>{pillar.score.toFixed(0)}</strong>
          <span>/100</span>
        </div>
      </div>

      <div className="health-impact-card__meta">
        <span className={`health-direction-badge health-direction-badge--${pillar.trend}`}>
          {TREND_LABEL[pillar.trend]}
        </span>
        <span className="health-impact-card__contribution">
          Contribution {pillar.weighted_score.toFixed(1)} pts
        </span>
        <span className="health-impact-card__confidence">
          Confidence {pillar.confidence.toFixed(0)}%
        </span>
      </div>

      <div className="health-impact-card__body">
        <div>
          <p className="health-impact-card__label">Main drivers</p>
          <ul className="health-impact-card__list">
            {pillar.drivers.slice(0, 3).map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="health-impact-card__label">Recommended action</p>
          <p className="health-impact-card__action">{pillar.recommended_action}</p>
        </div>
      </div>

      {extra ? <div className="health-impact-card__extra">{extra}</div> : null}
    </section>
  )
}
