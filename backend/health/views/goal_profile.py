"""Singleton HealthGoalProfile API."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from health.models import HealthGoalProfile
from health.serializers import HealthGoalProfileSerializer


class HealthGoalProfileAPIView(APIView):
    """GET/PUT the shared health goal profile."""

    def get(self, request):
        profile = HealthGoalProfile.get_solo()
        return Response(HealthGoalProfileSerializer(profile).data, status=status.HTTP_200_OK)

    def put(self, request):
        profile = HealthGoalProfile.get_solo()
        serializer = HealthGoalProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
