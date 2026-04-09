import { Navigate, Route, Routes } from 'react-router-dom'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { FinanceWorkspacePage } from '../pages/FinanceWorkspacePage'
import { GoalsPage } from '../pages/GoalsPage'
import { HealthBodyPage } from '../pages/HealthBodyPage'
import { HomePage } from '../pages/HomePage'
import { ContactsPage } from '../pages/ContactsPage'
import { JournalPage } from '../pages/JournalPage'
import { LearningPage } from '../pages/LearningPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AboutPage } from '../pages/AboutPage'
import { RoutinePage } from '../pages/RoutinePage'
import DaySchedulePage from '../pages/DaySchedulePage'
import { PageTransition } from '../components/PageTransition'
import { QueryErrorBoundary } from '../components/QueryErrorBoundary'

export function AppRoutes() {
  return (
    <QueryErrorBoundary>
      <PageTransition>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/routine" element={<RoutinePage />} />
          <Route path="/schedule" element={<DaySchedulePage />} />
          <Route path="/finance" element={<FinanceWorkspacePage />} />
          <Route path="/health" element={<HealthBodyPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </QueryErrorBoundary>
  )
}
