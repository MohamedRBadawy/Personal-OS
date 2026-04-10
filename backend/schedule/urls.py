"""URL routing for the Schedule domain.

Registers:
  /api/schedule/templates/      — ScheduleTemplate
  /api/schedule/blocks/         — ScheduleBlock
  /api/schedule/logs/           — ScheduleLog
  /api/schedule/routine-blocks/ — RoutineBlock (editable daily schedule)
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from schedule.views import (
    BlockStreakView,
    RoutineAnalyticsView,
    RoutineBriefingView,
    RoutineBlockViewSet,
    RoutineLogView,
    RoutineMetricsView,
    RoutineNotesView,
    RoutineStreakView,
    ScheduleTemplateViewSet,
    ScheduleBlockViewSet,
    ScheduleLogViewSet,
    ScheduledEntryViewSet,
    TodayScheduleAPIView,
)

router = DefaultRouter()
router.register("templates", ScheduleTemplateViewSet, basename="scheduletemplate")
router.register("blocks", ScheduleBlockViewSet, basename="scheduleblock")
router.register("logs", ScheduleLogViewSet, basename="schedulelog")
router.register("routine-blocks", RoutineBlockViewSet, basename="routine-block")
router.register("scheduled-entries", ScheduledEntryViewSet, basename="scheduled-entry")

urlpatterns = [
    path("today/", TodayScheduleAPIView.as_view(), name="schedule-today"),
    path("routine-log/", RoutineLogView.as_view(), name="routine-log"),
    path("routine-streak/", RoutineStreakView.as_view(), name="routine-streak"),
    path("block-streaks/", BlockStreakView.as_view(), name="block-streaks"),
    path("routine-metrics/", RoutineMetricsView.as_view(), name="routine-metrics"),
    path("routine-analytics/", RoutineAnalyticsView.as_view(), name="routine-analytics"),
    path("routine-notes/", RoutineNotesView.as_view(), name="routine-notes"),
    path("routine-briefing/", RoutineBriefingView.as_view(), name="routine-briefing"),
    path("", include(router.urls)),
]
