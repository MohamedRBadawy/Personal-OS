"""URL routing for the Journal domain.

Registers:
  /api/journal/entries/   — JournalEntryViewSet (CRUD, last 30)
  /api/journal/today/     — JournalTodayView (get/upsert today)
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from journal.views import JournalEntryViewSet, JournalTodayView

router = DefaultRouter()
router.register("entries", JournalEntryViewSet, basename="journal-entry")

urlpatterns = [
    path("today/", JournalTodayView.as_view(), name="journal-today"),
    path("", include(router.urls)),
]
