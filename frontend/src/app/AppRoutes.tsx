// [AR] تعريف مسارات التطبيق — كل مسار يُحدد داخل أحد المحاور السبعة
// [EN] App route definitions — each route belongs to one of the 7 navigation hubs
// Connects to: AppShell (active hub detection), hub pages

import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { FocusPage } from '../pages/FocusPage'
import { GoalsPage } from '../pages/GoalsPage'
import { FinanceWorkspacePage } from '../pages/FinanceWorkspacePage'
import { ContactsPage } from '../pages/ContactsPage'
import { JournalPage } from '../pages/JournalPage'
import { DailyCheckInPage } from '../pages/DailyCheckInPage'
import { ProfileHubPage } from '../pages/ProfileHubPage'
import { BusinessHubPage } from '../pages/BusinessHubPage'
import { ScheduleHubPage } from '../pages/ScheduleHubPage'
import { HealthHubPage } from '../pages/HealthHubPage'
import { AnalyticsHubPage } from '../pages/AnalyticsHubPage'
import { LearnIdeasHubPage } from '../pages/LearnIdeasHubPage'
import { PageTransition } from '../components/PageTransition'
import { QueryErrorBoundary } from '../components/QueryErrorBoundary'
import { DataBridgePage } from '../pages/DataBridgePage'

export function AppRoutes() {
  return (
    <QueryErrorBoundary>
      <PageTransition>
        <Routes>
          {/* Core */}
          <Route path="/" element={<HomePage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/daily" element={<DailyCheckInPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/finance" element={<FinanceWorkspacePage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/contacts" element={<ContactsPage />} />

          {/* Hub pages */}
          <Route path="/profile"  element={<ProfileHubPage />} />
          <Route path="/business" element={<BusinessHubPage />} />
          <Route path="/schedule" element={<ScheduleHubPage />} />
          <Route path="/health"   element={<HealthHubPage />} />
          <Route path="/analytics" element={<AnalyticsHubPage />} />
          <Route path="/learn"    element={<LearnIdeasHubPage />} />
          <Route path="/data-bridge" element={<DataBridgePage />} />

          {/* Redirects for old URLs */}
          <Route path="/about"     element={<Navigate to="/profile"  replace />} />
          <Route path="/life-plan" element={<Navigate to="/profile"  replace />} />
          <Route path="/pipeline"  element={<Navigate to="/business" replace />} />
          <Route path="/marketing" element={<Navigate to="/business" replace />} />
          <Route path="/routine"   element={<Navigate to="/schedule" replace />} />
          <Route path="/habits"    element={<Navigate to="/health"   replace />} />
          <Route path="/mood"      element={<Navigate to="/health"   replace />} />
          <Route path="/spiritual" element={<Navigate to="/health"   replace />} />
          <Route path="/learning"  element={<Navigate to="/learn"    replace />} />
          <Route path="/ideas"     element={<Navigate to="/learn"    replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </QueryErrorBoundary>
  )
}
