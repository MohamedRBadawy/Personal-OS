import { Navigate, Route, Routes } from 'react-router-dom'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { FinancePage } from '../pages/FinancePage'
import { GoalsPage } from '../pages/GoalsPage'
import { HabitsPage } from '../pages/HabitsPage'
import { HealthPage } from '../pages/HealthPage'
import { HomePage } from '../pages/HomePage'
import { MoodPage } from '../pages/MoodPage'
import { PipelinePage } from '../pages/PipelinePage'
import { SchedulePage } from '../pages/SchedulePage'
import {
  AchievementsPage,
  DecisionsPage,
  FamilyPage,
  IdeasPage,
  LearningPage,
  MarketingPage,
  RelationshipsPage,
} from '../pages/SimpleWorkspacePages'
import { SpiritualPage } from '../pages/SpiritualPage'
import { TimelinePage } from '../pages/TimelinePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/timeline" element={<TimelinePage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/goals" element={<GoalsPage />} />
      <Route path="/family" element={<FamilyPage />} />
      <Route path="/relationships" element={<RelationshipsPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/finance" element={<FinancePage />} />
      <Route path="/pipeline" element={<PipelinePage />} />
      <Route path="/marketing" element={<MarketingPage />} />
      <Route path="/learning" element={<LearningPage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="/habits" element={<HabitsPage />} />
      <Route path="/mood" element={<MoodPage />} />
      <Route path="/spiritual" element={<SpiritualPage />} />
      <Route path="/ideas" element={<IdeasPage />} />
      <Route path="/decisions" element={<DecisionsPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
