"""Routing for shared core APIs."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.chat_views import ChatView
from core.export import DomainExportView, DomainImportView, FullExportView
from core.views import AlertCountView, AlertDetailView, AlertReadAllView, AlertsView, AppSettingsViewSet, CommandCenterView, DailyCheckInStatusView, DashboardView, FocusView, NextActionView, ProfileViewSet, ReadinessView, ServiceHealthView, TelegramWebhookView

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")
router.register("settings", AppSettingsViewSet, basename="app-settings")

urlpatterns = [
    path("health/", ServiceHealthView.as_view(), name="service-health"),
    path("command-center/", CommandCenterView.as_view(), name="command-center"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("export/", FullExportView.as_view(), name="full-export"),
    path("export/domain/", DomainExportView.as_view(), name="domain-export"),
    path("import/", DomainImportView.as_view(), name="domain-import"),
    path("chat/", ChatView.as_view(), name="ai-chat"),
    path("next-action/", NextActionView.as_view(), name="next-action"),
    path("telegram/webhook/", TelegramWebhookView.as_view(), name="telegram-webhook"),
    path("checkin/today-status/", DailyCheckInStatusView.as_view(), name="checkin-today-status"),
    path("readiness/", ReadinessView.as_view(), name="kyrgyzstan-readiness"),
    path("focus/", FocusView.as_view(), name="focus-context"),
    path("alerts/", AlertsView.as_view(), name="alerts-list"),
    path("alerts/count/", AlertCountView.as_view(), name="alerts-count"),
    path("alerts/read-all/", AlertReadAllView.as_view(), name="alerts-read-all"),
    path("alerts/<int:pk>/<str:action>/", AlertDetailView.as_view(), name="alert-action"),
    path("", include(router.urls)),
]
