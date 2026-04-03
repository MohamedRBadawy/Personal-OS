"""Finance CRUD plus derived monthly summary."""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from finance.models import FinanceEntry
from finance.serializers import FinanceEntrySerializer
from finance.services import FinanceMetricsService


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
