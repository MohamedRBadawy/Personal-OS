"""API views for dependency-aware goal nodes."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from goals.models import GoalAttachmentProfile, Node
from goals.serializers import (
    GoalAttachmentProfileSerializer,
    NodeSerializer,
    NodeTreeSerializer,
)
from goals.services import GoalAttachmentSuggestionService, GoalMapService, NodeStatusService


class NodeViewSet(viewsets.ModelViewSet):
    """CRUD API plus tree, map, and context read models for nodes."""

    queryset = Node.objects.select_related("parent").prefetch_related("deps", "children")
    serializer_class = NodeSerializer

    def perform_destroy(self, instance):
        instance.delete()
        NodeStatusService.refresh_all()

    @action(detail=False, methods=["get"])
    def tree(self, request):
        roots = self.get_queryset().filter(parent__isnull=True).order_by("created_at")
        serializer = NodeTreeSerializer(roots, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def map(self, request):
        return Response(GoalMapService.payload(), status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"])
    def context(self, request, pk=None):
        node = self.get_object()
        attachment_profile = getattr(node, "attachment_profile", None)
        payload = {
            "node": NodeTreeSerializer(node).data,
            "ancestors": NodeSerializer(NodeStatusService.ancestor_chain(node), many=True).data,
            "dependents": NodeSerializer(node.dependents.all(), many=True).data,
            "progress_pct": NodeStatusService.progress_pct(node),
            "attachment_profile": (
                GoalAttachmentProfileSerializer(attachment_profile).data if attachment_profile else None
            ),
            "attachment_suggestions": GoalAttachmentSuggestionService.suggest(node),
        }
        return Response(payload, status=status.HTTP_200_OK)


class GoalAttachmentProfileViewSet(viewsets.ModelViewSet):
    """CRUD API for structured goal support layers."""

    queryset = GoalAttachmentProfile.objects.select_related("node")
    serializer_class = GoalAttachmentProfileSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        node_id = self.request.query_params.get("node")
        if node_id:
            queryset = queryset.filter(node_id=node_id)
        return queryset
