"""Grouped health overview API."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from health.services import HealthSummaryService


class HealthOverviewAPIView(APIView):
    """Expose the grouped health and body workspace payload."""

    def get(self, request):
        return Response(HealthSummaryService.overview_payload(), status=status.HTTP_200_OK)
