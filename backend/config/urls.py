"""Root URL configuration for Personal Life OS."""
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from analytics.views import IdeasOverviewAPIView, TimelineOverviewAPIView
from core.views import DailyCheckInView
from core.report_views import FinancialReportView, PersonalReviewReportView, ProgressReportView
from core.dashboard_v2 import DashboardV2View
from goals.views import NodeViewSet
from pipeline.views import WorkOverviewAPIView

nodes_router = DefaultRouter()
nodes_router.register("nodes", NodeViewSet, basename="nodes-v2")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/dashboard/", DashboardV2View.as_view(), name="dashboard-v2"),
    path("api/", include(nodes_router.urls)),
    path("api/checkin/", DailyCheckInView.as_view(), name="daily-checkin"),
    path("api/work/overview/", WorkOverviewAPIView.as_view(), name="work-overview"),
    path("api/timeline/overview/", TimelineOverviewAPIView.as_view(), name="timeline-overview"),
    path("api/ideas/overview/", IdeasOverviewAPIView.as_view(), name="ideas-overview"),
    path("api/reports/financial/", FinancialReportView.as_view(), name="financial-report"),
    path("api/reports/progress/", ProgressReportView.as_view(), name="progress-report"),
    path("api/reports/personal-review/", PersonalReviewReportView.as_view(), name="personal-review-report"),
    path("api/core/", include("core.urls")),
    path("api/goals/", include("goals.urls")),
    path("api/finance/", include("finance.urls")),
    path("api/health/", include("health.urls")),
    path("api/schedule/", include("schedule.urls")),
    path("api/pipeline/", include("pipeline.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/journal/", include("journal.urls")),
    path("api/contacts/", include("contacts.urls")),
    path("api/profile/", include("profile.urls")),
]
