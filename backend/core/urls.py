"""Routing for shared core APIs.

Registers:
  /api/core/profiles/   — Profile CRUD
  /api/core/settings/   — AppSettings CRUD
  /api/core/dashboard/  — Composite home-screen payload
  /api/core/export/     — Full JSON export of all 15 domain tables (Logic Spec §15)
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.export import FullExportView
from core.views import AppSettingsViewSet, DashboardView, ProfileViewSet

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")
router.register("settings", AppSettingsViewSet, basename="app-settings")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("export/", FullExportView.as_view(), name="full-export"),
    path("", include(router.urls)),
]
