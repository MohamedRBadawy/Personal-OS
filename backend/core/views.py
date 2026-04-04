"""Core endpoints for profile/settings and daily check-ins."""
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import AppSettings, Profile
from core.serializers import (
    AppSettingsSerializer,
    DailyCheckInRequestSerializer,
    ProfileSerializer,
)
from core.services import CheckInService, CommandCenterService, DashboardService


class ProfileViewSet(viewsets.ModelViewSet):
    """CRUD API for profile records."""

    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer


class AppSettingsViewSet(viewsets.ModelViewSet):
    """CRUD API for app settings."""

    queryset = AppSettings.objects.all()
    serializer_class = AppSettingsSerializer


class DailyCheckInView(APIView):
    """POST endpoint that fans a morning check-in into domain records."""

    def post(self, request):
        serializer = DailyCheckInRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = CheckInService.submit(serializer.validated_data)
        response = {
            "checkin_id": result["checkin"].id,
            "health_log_id": result["health_log"].id,
            "mood_log_id": getattr(result["mood_log"], "id", None),
            "finance_entry_ids": [entry.id for entry in result["finance_entries"]],
            "idea_id": getattr(result["idea"], "id", None),
            "blocker_id": getattr(result["blocker"], "id", None),
            "briefing": result["briefing"],
            "finance_summary": result["finance_summary"],
            "health_summary": result["health_summary"],
        }
        return Response(response, status=status.HTTP_201_CREATED)


class DashboardView(APIView):
    """GET endpoint returning the home-screen aggregate payload."""

    def get(self, request):
        return Response(DashboardService.payload(), status=status.HTTP_200_OK)


class CommandCenterView(APIView):
    """GET endpoint returning the unified command-center payload."""

    def get(self, request):
        return Response(CommandCenterService.payload(), status=status.HTTP_200_OK)
