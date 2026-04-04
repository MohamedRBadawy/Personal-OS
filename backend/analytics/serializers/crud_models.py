"""Serializers for simple CRUD analytics models.

Groups 6 straightforward ModelSerializers that share the same pattern:
Relationship, FamilyGoal, Learning, DecisionLog, Achievement, Idea.
"""
from rest_framework import serializers

from analytics.models.relationship import Relationship
from analytics.models.family_goal import FamilyGoal
from analytics.models.learning import Learning
from analytics.models.decision_log import DecisionLog
from analytics.models.achievement import Achievement
from analytics.models.idea import Idea
from analytics.models.project_retrospective import ProjectRetrospective


class RelationshipSerializer(serializers.ModelSerializer):
    """Serializer for Relationship — people and follow-ups."""

    class Meta:
        model = Relationship
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class FamilyGoalSerializer(serializers.ModelSerializer):
    """Serializer for FamilyGoal — shared family milestones."""

    class Meta:
        model = FamilyGoal
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class LearningSerializer(serializers.ModelSerializer):
    """Serializer for Learning — books, courses, skills."""

    class Meta:
        model = Learning
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class DecisionLogSerializer(serializers.ModelSerializer):
    """Serializer for DecisionLog — big decisions with reasoning."""

    class Meta:
        model = DecisionLog
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class AchievementSerializer(serializers.ModelSerializer):
    """Serializer for Achievement — wins and milestones."""

    class Meta:
        model = Achievement
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class IdeaSerializer(serializers.ModelSerializer):
    """Serializer for Idea — raw thoughts and concepts."""

    class Meta:
        model = Idea
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class ProjectRetrospectiveSerializer(serializers.ModelSerializer):
    """Serializer for stored retrospective records."""

    class Meta:
        model = ProjectRetrospective
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
