import { useState } from 'react'
import { HubTabs } from '../components/HubTabs'
import { PipelinePage } from './PipelinePage'
import { MarketingPage } from './MarketingPage'

const TABS = [
  { id: 'pipeline',  label: 'Pipeline'  },
  { id: 'marketing', label: 'Marketing' },
]

export function BusinessHubPage() {
  const [tab, setTab] = useState('pipeline')
  return (
    <div>
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'pipeline'  && <PipelinePage />}
      {tab === 'marketing' && <MarketingPage />}
    </div>
  )
}
