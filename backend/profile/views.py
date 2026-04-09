"""API views for the profile app."""
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ProfileSection, UserProfile
from .serializers import UserProfileSerializer


class ProfileView(APIView):
    """GET/PATCH the singleton user profile."""

    def get(self, request):
        profile = UserProfile.get_or_create_singleton()
        return Response(UserProfileSerializer(profile).data)

    def patch(self, request):
        profile = UserProfile.get_or_create_singleton()

        # Pull sections out before DRF validation (nested writes are handled manually)
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        sections_data = data.pop("sections", None)

        serializer = UserProfileSerializer(profile, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Replace all sections if provided
        if sections_data is not None:
            profile.sections.all().delete()
            for idx, section in enumerate(sections_data):
                ProfileSection.objects.create(
                    profile=profile,
                    title=section.get("title", ""),
                    content=section.get("content", ""),
                    order=section.get("order", idx),
                )

        return Response(UserProfileSerializer(profile).data)


class AIContextView(APIView):
    """GET a formatted plain-text AI context summary of the profile."""

    def get(self, request):
        profile = UserProfile.get_or_create_singleton()
        serializer = UserProfileSerializer(profile)
        return Response({"context": serializer.data["ai_context"]})
