"""API views for dependency-aware goal nodes."""
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from goals.models import Attachment, GoalAttachmentProfile, LearningItem, Node, TimeLog
from goals.serializers import (
    GoalAttachmentProfileSerializer,
    NodeSerializer,
    NodeTreeSerializer,
)
from goals.services import GoalAttachmentSuggestionService, GoalMapService, NodeStatusService


# ── Attachments ───────────────────────────────────────────────────────────────

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = [
            "id", "node", "page_context", "type", "title",
            "url", "file", "content", "tags", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AttachmentViewSet(viewsets.ModelViewSet):
    """CRUD API for node attachments (URLs, files, snippets)."""

    serializer_class = AttachmentSerializer
    pagination_class = None   # small per-node list — return full array

    def get_queryset(self):
        qs = Attachment.objects.all()
        node_id = self.request.query_params.get("node")
        if node_id:
            qs = qs.filter(node_id=node_id)
        return qs


class NodeViewSet(viewsets.ModelViewSet):
    """CRUD API plus tree, map, and context read models for nodes."""

    serializer_class = NodeSerializer

    def get_queryset(self):
        qs = Node.objects.select_related("parent").prefetch_related("deps", "children", "attachments", "timelogs")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        type_filter = self.request.query_params.get("type")
        if type_filter:
            qs = qs.filter(type=type_filter)
        bctx = self.request.query_params.get("business_context")
        if bctx:
            qs = qs.filter(business_context=bctx)
        return qs

    def perform_destroy(self, instance):
        instance.delete()
        NodeStatusService.refresh_all()

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Bulk-update the `order` field for a list of node IDs.

        Body: [{"id": 1, "order": 0}, {"id": 2, "order": 1}, ...]
        """
        items = request.data
        if not isinstance(items, list):
            return Response({"detail": "Expected a list."}, status=status.HTTP_400_BAD_REQUEST)
        for item in items:
            Node.objects.filter(pk=item["id"]).update(order=item["order"])
        return Response({"ok": True})

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

    @action(detail=True, methods=["post"])
    def decompose(self, request, pk=None):
        """Ask AI to break this node into 3–5 child task suggestions.

        Returns a list of suggested child nodes; the caller decides which to create.
        POST /api/goals/nodes/{id}/decompose/
        """
        node = self.get_object()
        active_goal_titles = list(
            Node.objects.filter(status__in=["active", "available"])
            .values_list("title", flat=True)[:10]
        )
        try:
            from core.ai import get_ai_provider  # noqa: PLC0415
            provider = get_ai_provider()
            subtasks = provider.decompose_node(
                node_title=node.title,
                node_type=node.type,
                node_notes=node.notes or "",
                node_why=getattr(node, "why", "") or "",
                active_goal_titles=active_goal_titles,
            )
        except Exception as exc:  # noqa: BLE001
            return Response(
                {"detail": f"AI decomposition failed: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"node_id": str(node.pk), "subtasks": subtasks}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def prioritize(self, request):
        """Return all non-completed nodes ranked by leverage score.

        Leverage score = dependent_count × 3 + (5 − priority_level) × 2 + active_bonus
        """
        EFFORT_WEIGHT = {
            "15min": 1, "30min": 1, "1h": 1,
            "2h": 2, "4h": 2, "1day": 3,
            "2days": 3, "1week": 4, "ongoing": 2,
        }
        qs = (
            Node.objects
            .exclude(status__in=["done", "deferred"])
            .prefetch_related("deps", "dependents")
        )
        results = []
        for node in qs:
            dep_count = node.dependents.count()
            blocked_by_count = node.deps.count()
            priority_val = node.priority or 3
            effort_w = EFFORT_WEIGHT.get(node.effort or "", 2)
            score = (
                dep_count * 3
                + (5 - priority_val) * 2
                + (2 if node.status == "active" else 1)
                - effort_w
            )
            results.append({
                "id": str(node.id),
                "title": node.title,
                "type": node.type,
                "status": node.status,
                "priority": node.priority,
                "effort": node.effort,
                "category": node.category,
                "business_context": node.business_context,
                "progress": node.progress,
                "dependent_count": dep_count,
                "blocked_by_count": blocked_by_count,
                "leverage_score": score,
            })
        results.sort(key=lambda x: x["leverage_score"], reverse=True)
        return Response(results)

    @action(detail=False, methods=["get"])
    def analytics_summary(self, request):
        """Goal health metrics for the Analytics page."""
        from datetime import timedelta  # noqa: PLC0415

        from django.db.models import Sum  # noqa: PLC0415
        from django.utils import timezone  # noqa: PLC0415

        today = timezone.localdate()
        stale_cutoff = timezone.now() - timedelta(days=14)
        month_start = today.replace(day=1)

        status_counts = {s.value: Node.objects.filter(status=s).count() for s in Node.Status}

        stalled = list(
            Node.objects.filter(
                status__in=[Node.Status.ACTIVE, Node.Status.AVAILABLE],
                updated_at__lt=stale_cutoff,
            ).values("id", "title", "category", "type", "updated_at")[:20]
        )

        top_time = list(
            Node.objects.annotate(total_mins=Sum("timelogs__minutes"))
            .filter(total_mins__gt=0)
            .order_by("-total_mins")
            .values("id", "title", "type", "category", "status", "total_mins")[:5]
        )

        completed_qs = Node.objects.filter(completed_at__date__gte=month_start)
        completed_this_month = list(
            completed_qs.values("id", "title", "type", "category", "completed_at")[:50]
        )

        return Response({
            "status_counts": status_counts,
            "stalled_goals": stalled,
            "top_time_goals": top_time,
            "completed_this_month": completed_this_month,
            "completed_this_month_count": completed_qs.count(),
        })


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


# ── Learning items ────────────────────────────────────────────────────────────

class LearningItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningItem
        fields = [
            "id", "title", "author", "type", "status", "progress_pct",
            "linked_node", "started", "finished", "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class LearningItemViewSet(viewsets.ModelViewSet):
    """CRUD for LearningItem — books, courses, articles being tracked."""
    serializer_class = LearningItemSerializer

    def get_queryset(self):
        qs = LearningItem.objects.all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        node_id = self.request.query_params.get("linked_node")
        if node_id:
            qs = qs.filter(linked_node_id=node_id)
        return qs


# ── Time Logs ─────────────────────────────────────────────────────────────────

class TimeLogSerializer(serializers.ModelSerializer):
    total_minutes_for_node = serializers.SerializerMethodField()

    class Meta:
        model = TimeLog
        fields = [
            "id", "node", "started_at", "ended_at",
            "minutes", "note", "logged_at",
            "total_minutes_for_node",
        ]
        read_only_fields = ["id", "logged_at", "total_minutes_for_node"]

    def get_total_minutes_for_node(self, obj):
        from django.db.models import Sum  # noqa: PLC0415
        result = TimeLog.objects.filter(node=obj.node).aggregate(total=Sum("minutes"))
        return result["total"] or 0


class TimeLogViewSet(viewsets.ModelViewSet):
    """CRUD for time logs — records actual time spent on nodes.

    Supports filtering by node: GET /api/goals/timelogs/?node=<id>
    """
    serializer_class = TimeLogSerializer
    pagination_class = None  # always small per-node list — return plain array

    def get_queryset(self):
        qs = TimeLog.objects.select_related("node")
        node_id = self.request.query_params.get("node")
        if node_id:
            qs = qs.filter(node_id=node_id)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        # Re-save to trigger auto-compute of minutes from start/end timestamps
        if instance.started_at and instance.ended_at and instance.minutes == 0:
            instance.save()
        return instance
