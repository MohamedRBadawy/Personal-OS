"""CRUD analytics views for supporting domain records."""
from rest_framework import viewsets

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


class ProjectRetrospectiveViewSet(viewsets.ModelViewSet):
    """CRUD API for retrospective records."""

    queryset = ProjectRetrospective.objects.all()
    serializer_class = ProjectRetrospectiveSerializer
