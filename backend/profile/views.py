"""API views for the profile app."""
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .serializers import UserProfileSerializer


class ProfileView(APIView):
    """GET/PATCH the singleton user profile."""

    def get(self, request):
        profile = UserProfile.get_or_create_singleton()
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile = UserProfile.get_or_create_singleton()
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AIContextView(APIView):
    """GET a formatted plain-text AI context summary of the profile."""

    def get(self, request):
        profile = UserProfile.get_or_create_singleton()
        serializer = UserProfileSerializer(profile)
        return Response({"context": serializer.data["ai_context"]})
