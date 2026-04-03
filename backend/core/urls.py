"""Routing for shared core APIs."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views import AppSettingsViewSet, DashboardView, ProfileViewSet

router = DefaultRouter()
router.register("profiles", ProfileViewSet, basename="profile")
router.register("settings", AppSettingsViewSet, basename="app-settings")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("", include(router.urls)),
]
