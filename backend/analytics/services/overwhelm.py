"""Overwhelm and reduced-mode calculations."""
from datetime import timedelta

from django.utils import timezone

from analytics.models.idea import Idea
from core.models import DailyCheckIn
from health.models.health_log import HealthLog
from health.models.mood_log import MoodLog
from health.services import HealthSummaryService


class OverwhelmService:
    """Calculates the cross-domain overwhelm score."""

    @staticmethod
    def _consecutive_low(queryset, field, threshold, reference_date):
        streak = 0
        lookup = {item.date: item for item in queryset}
        current = reference_date
        while current in lookup and getattr(lookup[current], field) <= threshold:
            streak += 1
            current -= timedelta(days=1)
        return streak

    @staticmethod
    def _checkin_gap(reference_date):
        streak = 0
        existing = set(
            DailyCheckIn.objects.filter(date__lte=reference_date).values_list("date", flat=True),
        )
        if not existing:
            return 30
        current = reference_date
        while current not in existing and streak < 30:
            streak += 1
            current -= timedelta(days=1)
        return streak

    @classmethod
    def summary(cls, reference_date=None):
        """Return the overwhelm score and reduced-mode decision."""
        reference_date = reference_date or timezone.localdate()
        window_start = reference_date - timedelta(days=6)

        mood_logs = MoodLog.objects.filter(date__range=(window_start, reference_date))
        health_logs = HealthLog.objects.filter(date__range=(window_start, reference_date))
        habit_rate = HealthSummaryService.overall_habit_completion_rate(7, reference_date)

        score = 0
        signals = []

        low_mood_streak = cls._consecutive_low(mood_logs, "mood_score", 2, reference_date)
        if low_mood_streak >= 2:
            score += 2
            signals.append("Mood has been low for at least two days.")

        low_energy_streak = cls._consecutive_low(health_logs, "energy_level", 2, reference_date)
        if low_energy_streak >= 2:
            score += 2
            signals.append("Energy has been low for at least two days.")

        checkin_gap = cls._checkin_gap(reference_date)
        if checkin_gap >= 2:
            score += 2
            signals.append("Daily check-ins were skipped for at least two days.")

        if habit_rate is not None and habit_rate < 50:
            score += 1
            signals.append("Habit completion rate is below 50% in the last 7 days.")

        inbox_unresolved = Idea.objects.filter(
            status__in=[Idea.Status.RAW, Idea.Status.EXPLORING],
        ).count()
        if inbox_unresolved > 10:
            score += 1
            signals.append("The inbox has more than 10 unresolved ideas.")

        return {
            "date": reference_date.isoformat(),
            "overwhelm_score": score,
            "reduced_mode": score >= 3,
            "max_priorities": 1 if score >= 3 else 3,
            "burnout_risk": low_mood_streak >= 3 or low_energy_streak >= 3,
            "signals": signals,
        }
