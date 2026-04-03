"""API views for simple CRUD analytics models.

Groups 6 straightforward ModelViewSets that share the same pattern:
Relationship, FamilyGoal, Learning, DecisionLog, Achievement, Idea.
"""
from rest_framework import viewsets

from analytics.models.relationship import Relationship
from analytics.models.family_goal import FamilyGoal
from analytics.models.learning import Learning
from analytics.models.decision_log import DecisionLog
from analytics.models.achievement import Achievement
from analytics.models.idea import Idea
from analytics.serializers.crud_models import (
    RelationshipSerializer,
    FamilyGoalSerializer,
    LearningSerializer,
    DecisionLogSerializer,
    AchievementSerializer,
    IdeaSerializer,
)


class RelationshipViewSet(viewsets.ModelViewSet):
    """CRUD API for Relationship — people and follow-ups."""
    queryset = Relationship.objects.all()
    serializer_class = RelationshipSerializer


class FamilyGoalViewSet(viewsets.ModelViewSet):
    """CRUD API for FamilyGoal — shared family milestones."""
    queryset = FamilyGoal.objects.all()
    serializer_class = FamilyGoalSerializer


class LearningViewSet(viewsets.ModelViewSet):
    """CRUD API for Learning — books, courses, skills."""
    queryset = Learning.objects.all()
    serializer_class = LearningSerializer


class DecisionLogViewSet(viewsets.ModelViewSet):
    """CRUD API for DecisionLog — big decisions with reasoning."""
    queryset = DecisionLog.objects.all()
    serializer_class = DecisionLogSerializer


class AchievementViewSet(viewsets.ModelViewSet):
    """CRUD API for Achievement — wins and milestones."""
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer


class IdeaViewSet(viewsets.ModelViewSet):
    """CRUD API for Idea — raw thoughts and concepts."""
    queryset = Idea.objects.all()
    serializer_class = IdeaSerializer
