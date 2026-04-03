"""Read model endpoint for aggregated health data."""
from rest_framework.response import Response
from rest_framework.views import APIView

from health.services import HealthSummaryService


class HealthSummaryAPIView(APIView):
    """Expose a single health summary payload for the frontend."""

    def get(self, request):
        return Response(HealthSummaryService.summary())
