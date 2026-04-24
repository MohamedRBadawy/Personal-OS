import { useState } from 'react'
import EquityPartnershipsPanel from '../components/EquityPartnershipsPanel'
import { HubTabs } from '../components/HubTabs'
import { Panel } from '../components/Panel'
import { PipelinePage } from './PipelinePage'
import { MarketingPage } from './MarketingPage'

const TABS = [
  { id: 'pipeline',     label: 'Pipeline'     },
  { id: 'marketing',   label: 'Marketing'    },
  { id: 'partnerships', label: 'Partnerships' },
]

export function BusinessHubPage() {
  const [tab, setTab] = useState('pipeline')
  return (
    <div>
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'pipeline'     && <PipelinePage />}
      {tab === 'marketing'    && <MarketingPage />}
      {tab === 'partnerships' && (
        <section className="page">
          <div className="page-header">
            <div>
              <p className="eyebrow">Business</p>
              <h2>Equity Partnerships</h2>
              <p>Track ownership stakes, active partners, and per-partnership next actions.</p>
            </div>
          </div>
          <Panel title="Partnerships" description="Your equity stakes and next actions per partner.">
            <EquityPartnershipsPanel />
          </Panel>
        </section>
      )}
    </div>
  )
}
