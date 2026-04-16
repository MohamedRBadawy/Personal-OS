"""Serializer for WearableLog."""
from rest_framework import serializers

from health.models.wearable import WearableLog


class WearableLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WearableLog
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
