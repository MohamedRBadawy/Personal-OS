import { Navigate, Route, Routes } from 'react-router-dom'
import { AchievementsTimelinePage } from '../pages/AchievementsTimelinePage'
import { FinanceWorkspacePage } from '../pages/FinanceWorkspacePage'
import { GoalsLifePlanPage } from '../pages/GoalsLifePlanPage'
import { HealthBodyPage } from '../pages/HealthBodyPage'
import { HomePage } from '../pages/HomePage'
import { IdeasThinkingPage } from '../pages/IdeasThinkingPage'
import { WorkCareerPage } from '../pages/WorkCareerPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/goals" element={<GoalsLifePlanPage />} />
      <Route path="/work" element={<WorkCareerPage />} />
      <Route path="/finance" element={<FinanceWorkspacePage />} />
      <Route path="/health" element={<HealthBodyPage />} />
      <Route path="/timeline" element={<AchievementsTimelinePage />} />
      <Route path="/ideas" element={<IdeasThinkingPage />} />
      <Route path="/analytics" element={<Navigate to="/timeline?tab=patterns" replace />} />
      <Route path="/family" element={<Navigate to="/goals?tab=family" replace />} />
      <Route path="/relationships" element={<Navigate to="/goals?tab=relationships" replace />} />
      <Route path="/schedule" element={<Navigate to="/work?tab=schedule" replace />} />
      <Route path="/pipeline" element={<Navigate to="/work?tab=pipeline" replace />} />
      <Route path="/marketing" element={<Navigate to="/work?tab=marketing" replace />} />
      <Route path="/learning" element={<Navigate to="/ideas?tab=learning" replace />} />
      <Route path="/habits" element={<Navigate to="/health?tab=habits" replace />} />
      <Route path="/mood" element={<Navigate to="/health?tab=mood" replace />} />
      <Route path="/spiritual" element={<Navigate to="/health?tab=spiritual" replace />} />
      <Route path="/decisions" element={<Navigate to="/ideas?tab=decisions" replace />} />
      <Route path="/achievements" element={<Navigate to="/timeline?tab=achievements" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
