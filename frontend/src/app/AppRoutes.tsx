import { Navigate, Route, Routes } from 'react-router-dom'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { FinancePage } from '../pages/FinancePage'
import { GoalsPage } from '../pages/GoalsPage'
import { HealthPage } from '../pages/HealthPage'
import { HomePage } from '../pages/HomePage'
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
      <Route path="/ideas" element={<IdeasPage />} />
      <Route path="/decisions" element={<DecisionsPage />} />
      <Route path="/achievements" element={<AchievementsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
