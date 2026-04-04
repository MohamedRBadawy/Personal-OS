"""URL routing for the Health domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from health.views import (
    HealthLogViewSet,
    HealthOverviewAPIView,
    HabitViewSet,
    HabitLogViewSet,
    HealthSummaryAPIView,
    HealthTodayAPIView,
    MoodLogViewSet,
    SpiritualLogViewSet,
)

router = DefaultRouter()
router.register("logs", HealthLogViewSet, basename="healthlog")
router.register("habits", HabitViewSet, basename="habit")
router.register("habit-logs", HabitLogViewSet, basename="habitlog")
router.register("moods", MoodLogViewSet, basename="moodlog")
router.register("spiritual", SpiritualLogViewSet, basename="spirituallog")

urlpatterns = [
    path("overview/", HealthOverviewAPIView.as_view(), name="health-overview"),
    path("summary/", HealthSummaryAPIView.as_view(), name="health-summary"),
    path("today/", HealthTodayAPIView.as_view(), name="health-today"),
    path("", include(router.urls)),
]
