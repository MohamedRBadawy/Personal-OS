"""URL routing for the Finance domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from finance.views import FinanceEntryViewSet, FinanceOverviewAPIView, IncomeSourceViewSet

router = DefaultRouter()
router.register("entries", FinanceEntryViewSet, basename="financeentry")
router.register("income-sources", IncomeSourceViewSet, basename="incomesource")

urlpatterns = [
    path("overview/", FinanceOverviewAPIView.as_view(), name="finance-overview"),
    path("", include(router.urls)),
]
