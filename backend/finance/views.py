"""Finance CRUD plus derived monthly summary."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import FinanceEntry, FinanceSummary, IncomeEvent, IncomeSource
from finance.serializers import FinanceEntrySerializer, FinanceSummarySerializer, IncomeEventSerializer, IncomeSourceSerializer
from finance.services import FinanceMetricsService, FinanceOverviewService


class FinanceEntryViewSet(viewsets.ModelViewSet):
    """CRUD API for FinanceEntry records plus a summary endpoint."""

    queryset = FinanceEntry.objects.all()
    serializer_class = FinanceEntrySerializer

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
