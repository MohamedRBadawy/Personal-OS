"""CRUD analytics views for supporting domain records."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from analytics.models.achievement import Achievement
from analytics.models.decision_log import DecisionLog
from analytics.models.family_goal import FamilyGoal
from analytics.models.idea import Idea
from analytics.models.learning import Learning
from analytics.models.project_retrospective import ProjectRetrospective
from analytics.models.relationship import Relationship
from analytics.serializers.crud_models import (
    AchievementSerializer,
    DecisionLogSerializer,
    FamilyGoalSerializer,
    IdeaSerializer,
    LearningSerializer,
    ProjectRetrospectiveSerializer,
    RelationshipSerializer,
)


class RelationshipViewSet(viewsets.ModelViewSet):
    """CRUD API for relationship records."""

    queryset = Relationship.objects.all()
    serializer_class = RelationshipSerializer


class FamilyGoalViewSet(viewsets.ModelViewSet):
    """CRUD API for family-goal records."""

    queryset = FamilyGoal.objects.all()
    serializer_class = FamilyGoalSerializer


class LearningViewSet(viewsets.ModelViewSet):
    """CRUD API for learning records."""

    queryset = Learning.objects.all()
    serializer_class = LearningSerializer


class DecisionLogViewSet(viewsets.ModelViewSet):
    """CRUD API for decision-log records."""

    queryset = DecisionLog.objects.all()
    serializer_class = DecisionLogSerializer


class AchievementViewSet(viewsets.ModelViewSet):
    """CRUD API for achievement records."""

    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer


class IdeaViewSet(viewsets.ModelViewSet):
    """CRUD API for idea records."""

    queryset = Idea.objects.all()
    serializer_class = IdeaSerializer

    @action(detail=True, methods=["post"])
    def convert_to_node(self, request, pk=None):
        """Convert an idea into a Node and link it back to this idea.

        Body: { type: str, parent: str|null }
        Returns: { node_id: str, node_title: str }
        """
        from goals.models import Node  # noqa: PLC0415

        idea = self.get_object()
        node_type = request.data.get("type", "task")
        parent_id = request.data.get("parent") or None

        valid_types = [c[0] for c in Node.Type.choices]
        if node_type not in valid_types:
            return Response(
                {"detail": f"Invalid type '{node_type}'. Valid: {valid_types}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        node = Node.objects.create(
            title=idea.title,
            notes=idea.context or "",
            type=node_type,
            status="available",
            parent_id=parent_id,
        )

        idea.linked_goal = node
        idea.status = "validated"
        idea.save(update_fields=["linked_goal", "status"])

        return Response({"node_id": str(node.id), "node_title": node.title}, status=status.HTTP_201_CREATED)


class ProjectRetrospectiveViewSet(viewsets.ModelViewSet):
    """CRUD API for retrospective records."""

    queryset = ProjectRetrospective.objects.all()
    serializer_class = ProjectRetrospectiveSerializer
