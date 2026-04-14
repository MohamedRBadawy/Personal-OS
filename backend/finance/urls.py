"""URL routing for the Finance domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from finance.views import (
    CategoryBreakdownView,
    DebtEntryViewSet,
    ExchangeRatesView,
    FinanceEntryViewSet,
    FinanceExportView,
    FinanceOverviewAPIView,
    FinanceSummaryView,
    IncomeEventViewSet,
    IncomeSourceViewSet,
    MonthlyBudgetPlanViewSet,
    MonthlyChartView,
    RecurringChecklistView,
)

router = DefaultRouter()
router.register("entries", FinanceEntryViewSet, basename="financeentry")
router.register("income-sources", IncomeSourceViewSet, basename="incomesource")
router.register("income-events", IncomeEventViewSet, basename="incomeevent")
router.register("budget-plans", MonthlyBudgetPlanViewSet, basename="budgetplan")
router.register("debts", DebtEntryViewSet, basename="debtentry")

urlpatterns = [
    path("overview/", FinanceOverviewAPIView.as_view(), name="finance-overview"),
    path("summary/", FinanceSummaryView.as_view(), name="finance-summary-v2"),
    path("exchange-rates/", ExchangeRatesView.as_view(), name="exchange-rates"),
    path("monthly-chart/", MonthlyChartView.as_view(), name="monthly-chart"),
    path("category-breakdown/", CategoryBreakdownView.as_view(), name="category-breakdown"),
    path("recurring-checklist/", RecurringChecklistView.as_view(), name="recurring-checklist"),
    path("export/", FinanceExportView.as_view(), name="finance-export"),
    path("", include(router.urls)),
]
