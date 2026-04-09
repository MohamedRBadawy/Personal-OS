"""URL routing for the Finance domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from finance.views import ExchangeRatesView, FinanceEntryViewSet, FinanceOverviewAPIView, FinanceSummaryView, IncomeEventViewSet, IncomeSourceViewSet

router = DefaultRouter()
router.register("entries", FinanceEntryViewSet, basename="financeentry")
router.register("income-sources", IncomeSourceViewSet, basename="incomesource")
router.register("income-events", IncomeEventViewSet, basename="incomeevent")

urlpatterns = [
    path("overview/", FinanceOverviewAPIView.as_view(), name="finance-overview"),
    path("summary/", FinanceSummaryView.as_view(), name="finance-summary-v2"),
    path("exchange-rates/", ExchangeRatesView.as_view(), name="exchange-rates"),
    path("", include(router.urls)),
]
