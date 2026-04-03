"""Serializer for HealthLog — daily physical health records."""
from rest_framework import serializers

from health.models.health_log import HealthLog


class HealthLogSerializer(serializers.ModelSerializer):
    """Serializer for HealthLog — sleep, energy, exercise, weight."""

    class Meta:
        model = HealthLog
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
