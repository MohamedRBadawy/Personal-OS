"""URL routing for the Schedule domain.

Registers:
  /api/schedule/templates/ — ScheduleTemplate
  /api/schedule/blocks/    — ScheduleBlock
  /api/schedule/logs/      — ScheduleLog
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from schedule.views import (
    ScheduleTemplateViewSet,
    ScheduleBlockViewSet,
    ScheduleLogViewSet,
    TodayScheduleAPIView,
)

router = DefaultRouter()
router.register("templates", ScheduleTemplateViewSet, basename="scheduletemplate")
router.register("blocks", ScheduleBlockViewSet, basename="scheduleblock")
router.register("logs", ScheduleLogViewSet, basename="schedulelog")

urlpatterns = [
    path("today/", TodayScheduleAPIView.as_view(), name="schedule-today"),
    path("", include(router.urls)),
]
