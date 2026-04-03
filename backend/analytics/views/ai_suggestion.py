"""API view for AI suggestion records and actions."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from analytics.models.ai_suggestion import AISuggestion
from analytics.serializers.ai_suggestion import AISuggestionSerializer
from analytics.services import AISuggestionService


class AISuggestionViewSet(viewsets.ModelViewSet):
    """Read suggestions and resolve them through explicit actions."""

    queryset = AISuggestion.objects.all()
    serializer_class = AISuggestionSerializer

    @action(detail=True, methods=["post"])
    def act(self, request, pk=None):
        suggestion = self.get_object()
        serializer = self.get_serializer(AISuggestionService.act(suggestion))
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        suggestion = self.get_object()
        serializer = self.get_serializer(AISuggestionService.dismiss(suggestion))
        return Response(serializer.data, status=status.HTTP_200_OK)
