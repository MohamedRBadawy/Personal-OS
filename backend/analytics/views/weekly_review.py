"""Weekly review CRUD and generation views."""
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models.weekly_review import WeeklyReview
from analytics.serializers.weekly_review import WeeklyReviewSerializer
from analytics.services import AISuggestionService, WeeklyReviewService


class WeeklyReviewViewSet(viewsets.ModelViewSet):
    """CRUD API for weekly reviews."""

    queryset = WeeklyReview.objects.all()
    serializer_class = WeeklyReviewSerializer
    http_method_names = ["get", "patch", "head", "options"]


class WeeklyReviewGenerateAPIView(APIView):
    """Generate and persist the current weekly review."""

    def post(self, request):
        result = WeeklyReviewService.generate()
        AISuggestionService.generate_for_review()
        serializer = WeeklyReviewSerializer(result["review"])
        return Response(
            {
                "review": serializer.data,
                "preview": result["preview"],
            },
            status=status.HTTP_201_CREATED if result["created"] else status.HTTP_200_OK,
        )
