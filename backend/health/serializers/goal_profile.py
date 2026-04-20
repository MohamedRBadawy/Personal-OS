"""Serializers for HealthGoalProfile."""
from rest_framework import serializers

from health.models import HealthGoalProfile


class HealthGoalProfileSerializer(serializers.ModelSerializer):
    """Serializer for the singleton health goal profile."""

    def validate_primary_goals(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("primary_goals must be a list.")
        deduped = list(dict.fromkeys(value))
        allowed = {choice for choice, _ in HealthGoalProfile.Goal.choices}
        invalid = [item for item in deduped if item not in allowed]
        if invalid:
            raise serializers.ValidationError(
                f"Invalid goals: {', '.join(invalid)}.",
            )
        if len(deduped) > 3:
            raise serializers.ValidationError("Choose up to 3 primary goals.")
        return deduped

    class Meta:
        model = HealthGoalProfile
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]
