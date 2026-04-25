// [AR] صفحة "الآن" — محور التنفيذ الرئيسي، يجمع الأقسام الفرعية
// [EN] Now hub home — execution layer orchestrator, assembles home sub-sections
// Connects to: FocusPage (/focus), DailyCheckInPage (/daily), ScheduleHubPage (/schedule) via HubTabBar

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { HubTabBar } from '../components/HubTabBar'
import {
  IntelligenceSurface,
  HomeNorthStarSection,
  HomeNowSection,
  HomeStatusSection,
} from '../components/home'
import {
  getDashboardV2,
  getCommandCenter,
  listRoutineBlocks,
  getRoutineLogs,
  saveRoutineLog,
  getCheckinTodayStatus,
  listAppSettings,
  toggleBadDayMode,
} from '../lib/api'
import { PageSkeleton } from '../components/PageSkeleton'
import { getCurrentBlock } from '../components/routine/helpers'
import type { CommandCenterPayload, DashboardV2 } from '../lib/types'
import type { RoutineBlock, RoutineLogEntry } from '../lib/types'

// [AR] تبويبات محور "الآن" — تتيح التنقل بين الصفحات الفرعية
// [EN] Now hub section tabs — navigate between Now sub-pages
const NOW_SECTIONS = [
  { href: '/',         label: 'Home'     },
  { href: '/focus',    label: 'Focus'    },
  { href: '/daily',    label: 'Daily'    },
  { href: '/schedule', label: 'Schedule' },
]

export function HomePage() {
  const queryClient = useQueryClient()
  const today = new Date().toLocaleDateString('en-CA')

  const { data: cc, isLoading: ccLoading } = useQuery<CommandCenterPayload>({
    queryKey: ['command-center'],
    queryFn: getCommandCenter,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })

  const { data, isLoading: dvLoading, error } = useQuery<DashboardV2>({
    queryKey: ['dashboard-v2'],
    queryFn: getDashboardV2,
  })

  const { data: routineBlocks = [] } = useQuery<RoutineBlock[]>({
    queryKey: ['routine-blocks'],
    queryFn: listRoutineBlocks,
    staleTime: 5 * 60 * 1000,
  })

  const { data: checkinStatus } = useQuery({
    queryKey: ['checkin-today-status'],
    queryFn: getCheckinTodayStatus,
    staleTime: 5 * 60 * 1000,
  })

  const { data: settingsData } = useQuery({
    queryKey: ['app-settings'],
    queryFn: listAppSettings,
    staleTime: 30 * 1000,
  })

  const { data: todayLogs = [] } = useQuery<RoutineLogEntry[]>({
    queryKey: ['routine-logs', today],
    queryFn: () => getRoutineLogs(today),
    staleTime: 60_000,
  })

  const logMut = useMutation({
    mutationFn: saveRoutineLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-logs', today] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-v2'] })
    },
  })

  const appSettings = settingsData?.results?.[0]
  const badDayMode = appSettings?.bad_day_mode ?? false

  const badDayMutation = useMutation({
    mutationFn: () => toggleBadDayMode(appSettings!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-settings'] }),
  })

  if (dvLoading || ccLoading) return <PageSkeleton />
  if (error || !data || !cc) return <div className="page-error">Could not load dashboard.</div>

  // [AR] القيم المحسوبة — تُشتق من بيانات CC وDashboardV2
  // [EN] Computed values — derived from CC and DashboardV2 data
  const currentBlock = getCurrentBlock(routineBlocks)

  const healthAlerts: string[] = []
  if (cc) {
    const s = cc.health_today.summary as Record<string, unknown>
    if (s.low_sleep_today)       healthAlerts.push('low_sleep')
    if (s.low_mood_today)        healthAlerts.push('low_mood')
    if ((s.prayer_gap_streak as number) > 0) healthAlerts.push('prayer_gap')
  } else {
    healthAlerts.push(...(data.health_pulse.alerts ?? []))
  }

  const hp = cc.health_today.summary

  // [AR] النطاق الزمني — يحدد ترتيب الأقسام بناءً على وقت اليوم
  // [EN] Time band — determines section order based on time of day
  const nowSection = (
    <HomeNowSection
      routineBlocks={routineBlocks}
      todayLogs={todayLogs}
      today={today}
      onLog={(blockTime, status) => logMut.mutate({ date: today, block_time: blockTime, status })}
      logPending={logMut.isPending}
      currentBlock={currentBlock}
      checkinStatus={checkinStatus}
      badDayMode={badDayMode}
      appSettings={appSettings}
      onToggleBadDay={() => badDayMutation.mutate()}
      badDayMutating={badDayMutation.isPending}
      pipelineSummary={cc.pipeline.summary}
      pipelineActiveCount={cc.pipeline.active_opportunities.length}
      journalStatus={data.journal_status}
      healthPulse={hp as { avg_sleep_7d: number | null; avg_mood_7d: number | null; full_prayer_streak: number; health_logged_today: boolean } | null}
      healthAlerts={healthAlerts}
      contactsDue={data.contacts_due}
    />
  )

  const northStarSection = <HomeNorthStarSection milestones={data.milestones} />
  const statusSection = <HomeStatusSection data={data} surplusEgp={data.surplus_egp} />

  return (
    <div className="home-page">
      <HubTabBar tabs={NOW_SECTIONS} />

      <IntelligenceSurface cc={cc} />
      <CollapsibleSection title="Today" storageKey="home-now" defaultOpen={false}>
        {nowSection}
      </CollapsibleSection>
      <CollapsibleSection title="North Star" storageKey="home-north-star" defaultOpen={false}>
        {northStarSection}
      </CollapsibleSection>
      {statusSection}
    </div>
  )
}
