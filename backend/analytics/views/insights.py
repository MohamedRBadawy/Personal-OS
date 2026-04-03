"""Read-model analytics endpoints."""
from datetime import date

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.services import AnalyticsOverviewService, OverwhelmService, TimelineService, WeeklyReviewService


class OverwhelmAPIView(APIView):
    """Expose the overwhelm score and reduced-mode decision."""

    def get(self, request):
        return Response(OverwhelmService.summary())


class WeeklyReviewPreviewAPIView(APIView):
    """Preview the generated weekly review without saving it."""

    def get(self, request):
        return Response(WeeklyReviewService.serialize_preview(WeeklyReviewService.preview()))


class AnalyticsOverviewAPIView(APIView):
    """Expose the Analytics page aggregate payload."""

    def get(self, request):
        return Response(AnalyticsOverviewService.payload(), status=status.HTTP_200_OK)


class TimelineAPIView(APIView):
    """Expose the week-based timeline read model."""

    def get(self, request):
        raw_week_start = request.query_params.get("week_start")
        week_start = None
        if raw_week_start:
            try:
                week_start = date.fromisoformat(raw_week_start)
            except ValueError as exc:
                raise ValidationError({"week_start": "Expected YYYY-MM-DD."}) from exc
        return Response(TimelineService.payload(week_start=week_start), status=status.HTTP_200_OK)
