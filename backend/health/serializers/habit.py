"""Serializers for Habit and HabitLog models."""
from rest_framework import serializers

from health.models.habit import Habit, HabitLog


class HabitSerializer(serializers.ModelSerializer):
    """Serializer for Habit definitions."""

    class Meta:
        model = Habit
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class HabitLogSerializer(serializers.ModelSerializer):
    """Serializer for HabitLog with explicit duplicate guidance."""

    def validate(self, attrs):
        habit = attrs.get("habit") or getattr(self.instance, "habit", None)
        date = attrs.get("date") or getattr(self.instance, "date", None)
        existing = HabitLog.objects.exclude(pk=getattr(self.instance, "pk", None))
        if habit and date and existing.filter(habit=habit, date=date).exists():
            raise serializers.ValidationError({
                "non_field_errors": [
                    "A habit log already exists for this habit and date. Update the existing record instead.",
                ],
            })
        return attrs

    class Meta:
        model = HabitLog
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
        validators = []
