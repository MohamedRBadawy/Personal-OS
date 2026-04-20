import type { HealthDirection } from '../../lib/types'

type HealthDirectionDashboardProps = {
  direction: HealthDirection
}

const TREND_COPY: Record<HealthDirection['trend'], string> = {
  improving: 'Improving',
  stable: 'Stable',
  declining: 'Declining',
}

export function HealthDirectionDashboard({ direction }: HealthDirectionDashboardProps) {
  return (
    <section className="health-direction-dashboard">
      <div className="health-direction-hero">
        <div>
          <p className="health-direction-hero__eyebrow">Whole-person health</p>
          <h2 className="health-direction-hero__title">Health Direction Score</h2>
          <p className="health-direction-hero__headline">{direction.headline}</p>
          <div className="health-direction-hero__meta">
            <span className={`health-direction-badge health-direction-badge--${direction.trend}`}>
              {TREND_COPY[direction.trend]}
            </span>
            <span>Confidence {direction.confidence.toFixed(0)}%</span>
            <span>14-day delta {direction.score_delta > 0 ? '+' : ''}{direction.score_delta.toFixed(1)}</span>
          </div>
        </div>
        <div className="health-direction-hero__score">
          <strong>{direction.overall_score.toFixed(0)}</strong>
          <span>/100</span>
        </div>
      </div>

      <div className="health-direction-pillars">
        {direction.pillars.map((pillar) => (
          <article key={pillar.id} className={`health-direction-pillar health-direction-pillar--${pillar.status}`}>
            <div className="health-direction-pillar__header">
              <span className="health-direction-pillar__label">{pillar.label}</span>
              <span className={`health-direction-badge health-direction-badge--${pillar.trend}`}>
                {TREND_COPY[pillar.trend]}
              </span>
            </div>
            <div className="health-direction-pillar__score-row">
              <strong>{pillar.score.toFixed(0)}</strong>
              <span>{pillar.weight.toFixed(0)}% weight</span>
            </div>
            <p className="health-direction-pillar__driver">
              {pillar.drivers[0] ?? pillar.recommended_action}
            </p>
          </article>
        ))}
      </div>

      <div className="health-direction-sections">
        <section className="health-direction-section">
          <p className="health-direction-section__eyebrow">Your strengths</p>
          <ul className="health-direction-list">
            {direction.strengths.length > 0 ? direction.strengths.map((item) => <li key={item}>{item}</li>) : <li>No strong pillar has separated itself yet.</li>}
          </ul>
        </section>
        <section className="health-direction-section">
          <p className="health-direction-section__eyebrow">Take care of these</p>
          <ul className="health-direction-list">
            {direction.watchouts.length > 0 ? direction.watchouts.map((item) => <li key={item}>{item}</li>) : <li>No urgent watchout is dominating the picture right now.</li>}
          </ul>
        </section>
        <section className="health-direction-section">
          <p className="health-direction-section__eyebrow">Next best actions</p>
          <ul className="health-direction-list">
            {direction.next_actions.length > 0 ? direction.next_actions.map((item) => <li key={item}>{item}</li>) : <li>Keep reinforcing the routines that are already working.</li>}
          </ul>
        </section>
      </div>

      <section className="health-direction-section health-direction-section--wide">
        <p className="health-direction-section__eyebrow">Why this changed</p>
        <ul className="health-direction-list">
          {direction.cross_domain_insights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </section>
  )
}
