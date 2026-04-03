"""API views for dependency-aware goal nodes."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from goals.models import Node
from goals.serializers import NodeSerializer, NodeTreeSerializer
from goals.services import GoalMapService, NodeStatusService


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
        payload = {
            "node": NodeTreeSerializer(node).data,
            "ancestors": NodeSerializer(NodeStatusService.ancestor_chain(node), many=True).data,
            "dependents": NodeSerializer(node.dependents.all(), many=True).data,
            "progress_pct": NodeStatusService.progress_pct(node),
        }
        return Response(payload, status=status.HTTP_200_OK)
