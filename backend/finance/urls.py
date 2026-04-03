"""URL routing for the Finance domain.

Registers: /api/finance/entries/
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from finance.views import FinanceEntryViewSet

router = DefaultRouter()
router.register("entries", FinanceEntryViewSet, basename="financeentry")

urlpatterns = [
    path("", include(router.urls)),
]
