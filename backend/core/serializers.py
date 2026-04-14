"""Serializers for shared core APIs."""
from rest_framework import serializers

from core.models import Alert, AppSettings, DailyCheckIn, Profile
from finance.models import FinanceEntry


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for the static profile record."""

    class Meta:
        model = Profile
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class AppSettingsSerializer(serializers.ModelSerializer):
    """Serializer for app-wide business constants."""

    class Meta:
        model = AppSettings
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class DailyCheckInSerializer(serializers.ModelSerializer):
    """Serializer for persisted check-in records."""

    class Meta:
        model = DailyCheckIn
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "briefing_text"]


class DailyCheckInStatusSerializer(serializers.Serializer):
    """Read-only status of today's check-in sessions."""

    date = serializers.DateField()
    morning_done = serializers.BooleanField()
    evening_done = serializers.BooleanField()
    morning_completed_at = serializers.DateTimeField(allow_null=True)
    evening_completed_at = serializers.DateTimeField(allow_null=True)


class EveningCheckInSerializer(serializers.Serializer):
    """Request body for submitting the evening check-in fields."""

    mood_score = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=10)
    gratitude_note = serializers.CharField(required=False, allow_blank=True)
    evening_wins = serializers.CharField(required=False, allow_blank=True)
    tomorrow_focus = serializers.CharField(required=False, allow_blank=True)


class FinanceDeltaSerializer(serializers.Serializer):
    """Inline serializer for finance entries submitted during a check-in."""

    type = serializers.ChoiceField(choices=FinanceEntry.EntryType.choices)
    source = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.ChoiceField(choices=FinanceEntry.Currency.choices)
    is_independent = serializers.BooleanField(default=False)
    is_recurring = serializers.BooleanField(default=False)
    date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class AlertSerializer(serializers.ModelSerializer):
    """Read serializer for system alerts."""

    class Meta:
        model = Alert
        fields = [
            "id", "alert_type", "title", "body", "priority",
            "link_url", "read", "sent_telegram", "dismissed_at",
            "resolved_at", "date", "created_at",
        ]
        read_only_fields = fields


class DailyCheckInRequestSerializer(serializers.Serializer):
    """Request contract for the morning check-in endpoint."""

    date = serializers.DateField(required=False)
    sleep_hours = serializers.DecimalField(max_digits=4, decimal_places=1)
    sleep_quality = serializers.IntegerField(min_value=1, max_value=5)
    energy_level = serializers.IntegerField(min_value=1, max_value=5)
    exercise_done = serializers.BooleanField(default=False)
    exercise_type = serializers.CharField(required=False, allow_blank=True)
    exercise_duration_mins = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    mood_score = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=5)
    finance_deltas = FinanceDeltaSerializer(many=True, required=False)
    inbox_text = serializers.CharField(required=False, allow_blank=True)
    blockers_text = serializers.CharField(required=False, allow_blank=True)
