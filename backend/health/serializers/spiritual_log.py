"""Serializer for SpiritualLog - prayer and Quran tracking."""
from rest_framework import serializers

from health.models.spiritual_log import SpiritualLog


class SpiritualLogSerializer(serializers.ModelSerializer):
    """Serializer for SpiritualLog with explicit one-per-day validation."""

    prayers_count = serializers.IntegerField(read_only=True)

    def validate(self, attrs):
        date = attrs.get("date") or getattr(self.instance, "date", None)
        existing = SpiritualLog.objects.exclude(pk=getattr(self.instance, "pk", None))
        if date and existing.filter(date=date).exists():
            raise serializers.ValidationError({
                "date": "A spiritual log already exists for this date. Update the existing record instead.",
            })
        return attrs

    class Meta:
        model = SpiritualLog
        fields = "__all__"
        read_only_fields = ["id", "created_at", "prayers_count"]
        extra_kwargs = {"date": {"validators": []}}
