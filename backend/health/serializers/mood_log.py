"""Serializer for MoodLog - daily mood tracking."""
from rest_framework import serializers

from health.models.mood_log import MoodLog


class MoodLogSerializer(serializers.ModelSerializer):
    """Serializer for MoodLog with a clear one-per-day validation message."""

    def validate(self, attrs):
        date = attrs.get("date") or getattr(self.instance, "date", None)
        existing = MoodLog.objects.exclude(pk=getattr(self.instance, "pk", None))
        if date and existing.filter(date=date).exists():
            raise serializers.ValidationError({
                "date": "A mood log already exists for this date. Update the existing record instead.",
            })
        return attrs

    class Meta:
        model = MoodLog
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {"date": {"validators": []}}
