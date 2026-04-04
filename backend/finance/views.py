"""Finance CRUD plus derived monthly summary."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import FinanceEntry, IncomeSource
from finance.serializers import FinanceEntrySerializer, IncomeSourceSerializer
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
