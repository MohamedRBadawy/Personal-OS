"""Serializers for the Schedule domain."""
from django.db import transaction
from rest_framework import serializers

from schedule.models import ScheduleTemplate, ScheduleBlock, ScheduleLog, ScheduledEntry


class ScheduleTemplateSerializer(serializers.ModelSerializer):
    """Serializer for schedule templates."""

    @transaction.atomic
    def create(self, validated_data):
        template = ScheduleTemplate.objects.create(**validated_data)
        if template.is_active:
            ScheduleTemplate.objects.exclude(pk=template.pk).update(is_active=False)
        return template

    @transaction.atomic
    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if instance.is_active:
            ScheduleTemplate.objects.exclude(pk=instance.pk).update(is_active=False)
        return instance

    class Meta:
        model = ScheduleTemplate
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class ScheduleBlockSerializer(serializers.ModelSerializer):
    """Serializer for schedule blocks."""

    class Meta:
        model = ScheduleBlock
        fields = "__all__"
        read_only_fields = ["id"]


class ScheduleLogSerializer(serializers.ModelSerializer):
    """Serializer for schedule log records."""

    def validate(self, attrs):
        block = attrs.get("block", getattr(self.instance, "block", None))
        date = attrs.get("date", getattr(self.instance, "date", None))

        if block and date:
            existing = ScheduleLog.objects.filter(block=block, date=date)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    "Only one schedule log is allowed per block and date.",
                )

        return attrs

    class Meta:
        model = ScheduleLog
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class ScheduledEntrySerializer(serializers.ModelSerializer):
    """Serializer for one-off scheduled task entries."""

    node_title = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ScheduledEntry
        fields = [
            "id", "date", "time", "duration_minutes",
            "node", "node_title", "label", "done", "created_at",
        ]
        read_only_fields = ["id", "created_at", "node_title"]

    def get_node_title(self, obj):
        return obj.node.title if obj.node_id else None

    def validate(self, data):
        """Prevent overlapping scheduled entries on the same date."""
        date     = data.get('date',             getattr(self.instance, 'date',             None))
        time     = data.get('time',             getattr(self.instance, 'time',             None))
        duration = data.get('duration_minutes', getattr(self.instance, 'duration_minutes', 60))

        if date and time:
            start_min = time.hour * 60 + time.minute
            end_min   = start_min + duration

            qs = ScheduledEntry.objects.filter(date=date)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            for entry in qs:
                e_start = entry.time.hour * 60 + entry.time.minute
                e_end   = e_start + entry.duration_minutes
                if start_min < e_end and end_min > e_start:
                    conflict_label = (
                        entry.node.title if entry.node_id else (entry.label or 'another task')
                    )
                    raise serializers.ValidationError(
                        f"Time conflict with '{conflict_label}' at {entry.time.strftime('%H:%M')}."
                    )
        return data
