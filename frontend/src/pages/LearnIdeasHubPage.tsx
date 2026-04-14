import { useState } from 'react'
import { HubTabs } from '../components/HubTabs'
import { LearningPage } from './LearningPage'
import { IdeasThinkingPage } from './IdeasThinkingPage'

const TABS = [
  { id: 'learning', label: 'Learning' },
  { id: 'ideas',    label: 'Ideas'    },
]

export function LearnIdeasHubPage() {
  const [tab, setTab] = useState('learning')
  return (
    <div>
      <HubTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'learning' && <LearningPage />}
      {tab === 'ideas'    && <IdeasThinkingPage />}
    </div>
  )
}
