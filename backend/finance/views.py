"""Finance CRUD plus derived monthly summary."""
import csv
import io
from datetime import date

from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import FinanceEntry, FinanceSummary, IncomeEvent, IncomeSource
from finance.serializers import FinanceEntrySerializer, FinanceSummarySerializer, IncomeEventSerializer, IncomeSourceSerializer
from finance.services import FinanceMetricsService, FinanceOverviewService


class FinanceEntryViewSet(viewsets.ModelViewSet):
    """CRUD API for FinanceEntry records plus a summary endpoint."""

    serializer_class = FinanceEntrySerializer
    pagination_class = None   # return full list, not paginated

    def get_queryset(self):
        qs = FinanceEntry.objects.all()
        month = self.request.query_params.get("month")    # "2026-04"
        type_ = self.request.query_params.get("type")     # "income" | "expense"
        cat = self.request.query_params.get("category")   # "food" etc.
        if month:
            try:
                year, m = month.split("-")
                qs = qs.filter(date__year=int(year), date__month=int(m))
            except (ValueError, AttributeError):
                pass
        if type_:
            qs = qs.filter(type=type_)
        if cat:
            qs = qs.filter(category=cat)
        return qs

    def perform_create(self, serializer):
        serializer.save()
        FinanceMetricsService.sync_goal_status()

    def perform_update(self, serializer):
        serializer.save()
        FinanceMetricsService.sync_goal_status()

    def perform_destroy(self, instance):
        instance.delete()
        FinanceMetricsService.sync_goal_status()

    @action(detail=False, methods=["get"])
    def summary(self, request):
        return Response(FinanceMetricsService.summary())


class IncomeSourceViewSet(viewsets.ModelViewSet):
    """CRUD API for named income streams."""

    queryset = IncomeSource.objects.all()
    serializer_class = IncomeSourceSerializer


class FinanceOverviewAPIView(APIView):
    """Expose the grouped finance workspace payload."""

    def get(self, request):
        return Response(FinanceOverviewService.payload(), status=status.HTTP_200_OK)


class IncomeEventViewSet(viewsets.ModelViewSet):
    """CRUD API for income history events."""

    queryset = IncomeEvent.objects.all()
    serializer_class = IncomeEventSerializer
    pagination_class = None   # small list — return full array, not paginated


class FinanceSummaryView(APIView):
    """Singleton finance summary — GET to read, PUT to update."""

    def get(self, request):
        obj = FinanceSummary.get()
        return Response(FinanceSummarySerializer(obj).data, status=status.HTTP_200_OK)

    def put(self, request):
        obj = FinanceSummary.get()
        serializer = FinanceSummarySerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExchangeRatesView(APIView):
    """GET / PATCH the live EUR/EGP and EUR/USD exchange rates."""

    def get(self, request):
        from core.models import AppSettings
        s = AppSettings.get_solo()
        egp_rate = float(s.eur_to_egp_rate)
        usd_rate = float(s.eur_to_usd_rate)
        return Response({
            "eur_to_egp": egp_rate,
            "eur_to_usd": usd_rate,
            "usd_to_egp": round(egp_rate / usd_rate, 4),
        })

    def patch(self, request):
        from core.models import AppSettings
        from decimal import Decimal
        s = AppSettings.get_solo()
        if "eur_to_egp" in request.data:
            s.eur_to_egp_rate = Decimal(str(request.data["eur_to_egp"]))
        if "eur_to_usd" in request.data:
            s.eur_to_usd_rate = Decimal(str(request.data["eur_to_usd"]))
        s.save()
        return self.get(request)


class MonthlyChartView(APIView):
    """Last 6 months of income vs expenses in EUR."""

    def get(self, request):
        today = date.today()
        result = []
        for i in range(5, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            label = date(y, m, 1).strftime("%b %Y")
            qs = FinanceEntry.objects.filter(date__year=y, date__month=m)
            income = sum(
                float(FinanceMetricsService.convert_to_eur(e.amount, e.currency))
                for e in qs.filter(type="income")
            )
            expense = sum(
                float(FinanceMetricsService.convert_to_eur(e.amount, e.currency))
                for e in qs.filter(type="expense")
            )
            indep = sum(
                float(FinanceMetricsService.convert_to_eur(e.amount, e.currency))
                for e in qs.filter(type="income", is_independent=True)
            )
            result.append({
                "month": f"{y:04d}-{m:02d}",
                "label": label,
                "income_eur": round(income, 2),
                "expense_eur": round(expense, 2),
                "independent_eur": round(indep, 2),
                "net_eur": round(income - expense, 2),
            })
        return Response(result)


class CategoryBreakdownView(APIView):
    """Expense totals grouped by category for a given month (or all time)."""

    def get(self, request):
        month = request.query_params.get("month")
        qs = FinanceEntry.objects.filter(type="expense")
        if month:
            try:
                year, m = month.split("-")
                qs = qs.filter(date__year=int(year), date__month=int(m))
            except (ValueError, AttributeError):
                pass
        cats: dict = {}
        category_labels = dict(FinanceEntry.Category.choices)
        for e in qs:
            key = e.category or "other"
            if key not in cats:
                cats[key] = {
                    "category": key,
                    "label": category_labels.get(key, key.replace("_", " ").title()),
                    "total_egp": 0.0,
                    "total_eur": 0.0,
                    "count": 0,
                }
            cats[key]["total_egp"] += float(FinanceMetricsService.convert_to_egp(e.amount, e.currency))
            cats[key]["total_eur"] += float(FinanceMetricsService.convert_to_eur(e.amount, e.currency))
            cats[key]["count"] += 1
        result = sorted(cats.values(), key=lambda x: x["total_egp"], reverse=True)
        for r in result:
            r["total_egp"] = round(r["total_egp"], 2)
            r["total_eur"] = round(r["total_eur"], 2)
        return Response(result)


class RecurringChecklistView(APIView):
    """Recurring entries and whether each has been logged this month."""

    def get(self, request):
        today = date.today()
        logged_sources = set(
            FinanceEntry.objects.filter(
                date__year=today.year,
                date__month=today.month,
            ).values_list("source", flat=True)
        )
        recurring = (
            FinanceEntry.objects.filter(is_recurring=True)
            .values("source", "type", "category", "amount", "currency")
            .distinct()
        )
        result = []
        seen: set = set()
        for r in recurring:
            key = (r["source"], r["type"])
            if key in seen:
                continue
            seen.add(key)
            result.append({
                "source": r["source"],
                "type": r["type"],
                "category": r["category"],
                "amount": str(r["amount"]),
                "currency": r["currency"],
                "amount_egp": round(
                    float(FinanceMetricsService.convert_to_egp(r["amount"], r["currency"])), 2
                ),
                "logged_this_month": r["source"] in logged_sources,
            })
        return Response(result)


class FinanceExportView(APIView):
    """CSV download of finance entries, optionally filtered by month."""

    def get(self, request):
        month = request.query_params.get("month")
        qs = FinanceEntry.objects.all().order_by("-date")
        if month:
            try:
                year, m = month.split("-")
                qs = qs.filter(date__year=int(year), date__month=int(m))
            except (ValueError, AttributeError):
                pass
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "date", "type", "source", "category",
            "amount", "currency", "amount_eur", "amount_egp",
            "is_independent", "is_recurring", "notes",
        ])
        for e in qs:
            writer.writerow([
                e.date, e.type, e.source, e.category,
                e.amount, e.currency,
                round(float(FinanceMetricsService.convert_to_eur(e.amount, e.currency)), 2),
                round(float(FinanceMetricsService.convert_to_egp(e.amount, e.currency)), 2),
                e.is_independent, e.is_recurring, e.notes,
            ])
        fname = f"finance_{month or 'all'}.csv"
        return HttpResponse(
            buf.getvalue(),
            content_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{fname}"'},
        )
