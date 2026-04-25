"""Weekly review CRUD and generation views."""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models.review_commitment import ReviewCommitment
from analytics.models.weekly_review import WeeklyReview
from analytics.serializers.review_commitment import ReviewCommitmentSerializer
from analytics.serializers.weekly_review import WeeklyReviewSerializer
from analytics.services import AISuggestionService, WeeklyReviewService


class WeeklyReviewViewSet(viewsets.ModelViewSet):
    """CRUD API for weekly reviews."""

    queryset = WeeklyReview.objects.all()
    serializer_class = WeeklyReviewSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    @action(detail=True, methods=["get", "post"], url_path="commitments")
    def commitments_list(self, request, pk=None):
        """List or bulk-create commitments for a weekly review."""
        review = self.get_object()
        if request.method == "GET":
            serializer = ReviewCommitmentSerializer(review.commitments.select_related("node_update"), many=True)
            return Response(serializer.data)

        serializer = ReviewCommitmentSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        commitments = [
            ReviewCommitment.objects.create(review=review, **item)
            for item in serializer.validated_data
        ]
        return Response(ReviewCommitmentSerializer(commitments, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="prior-commitments")
    def check_prior_commitments(self, request):
        """Return previous review commitments still waiting for accountability."""
        commitments = WeeklyReviewService.get_prior_commitments(timezone.localdate())
        payload = [
            {
                "id": str(commitment.id),
                "action_type": commitment.action_type,
                "description": commitment.description,
                "from_week": commitment.review.week_start.isoformat(),
            }
            for commitment in commitments
        ]
        return Response(payload)

    @action(detail=False, methods=["patch"], url_path=r"commitments/(?P<commitment_id>[^/.]+)")
    def update_commitment(self, request, commitment_id=None):
        """Mark a commitment as kept or not kept."""
        commitment = get_object_or_404(ReviewCommitment, pk=commitment_id)
        serializer = ReviewCommitmentSerializer(commitment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


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
