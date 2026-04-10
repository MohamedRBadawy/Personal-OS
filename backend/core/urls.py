"""Routing for shared core APIs."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.chat_views import ChatView
from core.export import FullExportView
from core.views import AppSettingsViewSet, CommandCenterView, DashboardView, NextActionView, ProfileViewSet, TelegramWebhookView

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")
router.register("settings", AppSettingsViewSet, basename="app-settings")

urlpatterns = [
    path("command-center/", CommandCenterView.as_view(), name="command-center"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("export/", FullExportView.as_view(), name="full-export"),
    path("chat/", ChatView.as_view(), name="ai-chat"),
    path("next-action/", NextActionView.as_view(), name="next-action"),
    path("telegram/webhook/", TelegramWebhookView.as_view(), name="telegram-webhook"),
    path("", include(router.urls)),
]
