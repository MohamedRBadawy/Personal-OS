"""Read model endpoint for the daily health workspace."""
from rest_framework.response import Response
from rest_framework.views import APIView

from health.services import HealthSummaryService


class HealthTodayAPIView(APIView):
    """Expose the current-day health workspace payload for the frontend."""

    def get(self, request):
        return Response(HealthSummaryService.today_workspace())
