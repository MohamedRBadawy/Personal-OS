"""Root URL configuration for Personal Life OS."""
from django.contrib import admin
from django.urls import include, path

from core.views import DailyCheckInView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/checkin/", DailyCheckInView.as_view(), name="daily-checkin"),
    path("api/core/", include("core.urls")),
    path("api/goals/", include("goals.urls")),
    path("api/finance/", include("finance.urls")),
    path("api/health/", include("health.urls")),
    path("api/schedule/", include("schedule.urls")),
    path("api/pipeline/", include("pipeline.urls")),
    path("api/analytics/", include("analytics.urls")),
]
