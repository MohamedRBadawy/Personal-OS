"""Serializer for WeeklyReview — AI-generated weekly reports."""
from rest_framework import serializers

from analytics.models.weekly_review import WeeklyReview


class WeeklyReviewSerializer(serializers.ModelSerializer):
    """Serializer for WeeklyReview records."""

    class Meta:
        model = WeeklyReview
        fields = "__all__"
        read_only_fields = ["id", "created_at", "week_start", "week_end", "ai_report"]
