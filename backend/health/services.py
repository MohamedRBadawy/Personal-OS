"""Derived metrics for health, habit, mood, and spiritual domains."""
from datetime import timedelta

from django.db.models import Avg
from django.utils import timezone

from health.models.habit import Habit, HabitLog
from health.models.health_log import HealthLog
from health.models.mood_log import MoodLog
from health.models.spiritual_log import SpiritualLog
from health.serializers import (
    HabitLogSerializer,
    HabitSerializer,
    HealthLogSerializer,
    MoodLogSerializer,
    SpiritualLogSerializer,
)


class HealthSummaryService:
    """Aggregates the health-related domains into one read model."""

    @staticmethod
    def _window(days, reference_date):
        start = reference_date - timedelta(days=days - 1)
        return start, reference_date

    @staticmethod
    def _average(queryset, field):
        value = queryset.aggregate(result=Avg(field))["result"]
        return round(float(value), 2) if value is not None else None

    @staticmethod
    def _percentage(numerator, denominator):
        if denominator == 0:
            return None
        return round((numerator / denominator) * 100, 2)

    @classmethod
    def _streak(cls, queryset, attr, reference_date):
        streak = 0
        current_date = reference_date
        lookup = {item.date: item for item in queryset}
        while current_date in lookup and getattr(lookup[current_date], attr):
            streak += 1
            current_date -= timedelta(days=1)
        return streak

    @classmethod
    def _threshold_streak(cls, queryset, attr, threshold, reference_date):
        streak = 0
        current_date = reference_date
        lookup = {item.date: item for item in queryset}
        while current_date in lookup and getattr(lookup[current_date], attr) <= threshold:
            streak += 1
            current_date -= timedelta(days=1)
        return streak

    @classmethod
    def _prayer_gap_streak(cls, queryset, reference_date):
        streak = 0
        current_date = reference_date
        lookup = {item.date: item for item in queryset}
        while current_date in lookup and lookup[current_date].prayers_count < 5:
            streak += 1
            current_date -= timedelta(days=1)
        return streak

    @staticmethod
    def _expected_occurrences(habit, days):
        if habit.target == Habit.Target.DAILY:
            return days
        if habit.target == Habit.Target.THREE_X_WEEK:
            return max(1, round((days / 7) * 3))
        if habit.target == Habit.Target.WEEKLY:
            return max(1, round(days / 7))
        return max(1, round((days / 7) * (habit.custom_days or 1)))

    @classmethod
    def habit_completion_rate(cls, habit, days, reference_date=None):
        """Return the capped completion rate for one habit over a window."""
        reference_date = reference_date or timezone.localdate()
        start_date, end_date = cls._window(days, reference_date)
        expected = cls._expected_occurrences(habit, days)
        completed = HabitLog.objects.filter(
            habit=habit,
            done=True,
            date__range=(start_date, end_date),
        ).count()
        return cls._percentage(min(completed, expected), expected)

    @classmethod
    def habit_streak(cls, habit, reference_date=None):
        """Return the consecutive done streak for a habit ending today."""
        reference_date = reference_date or timezone.localdate()
        logs = HabitLog.objects.filter(habit=habit, date__lte=reference_date)
        return cls._streak(logs, "done", reference_date)

    @classmethod
    def overall_habit_completion_rate(cls, days, reference_date=None):
        reference_date = reference_date or timezone.localdate()
        start_date, end_date = cls._window(days, reference_date)
        habits = Habit.objects.all()
        expected = 0
        completed = 0
        for habit in habits:
            habit_expected = cls._expected_occurrences(habit, days)
            expected += habit_expected
            habit_completed = HabitLog.objects.filter(
                habit=habit,
                done=True,
                date__range=(start_date, end_date),
            ).count()
            completed += min(habit_completed, habit_expected)
        return cls._percentage(completed, expected)

    @classmethod
    def summary(cls, reference_date=None):
        """Return the combined health dashboard summary."""
        reference_date = reference_date or timezone.localdate()
        start_7d, end_date = cls._window(7, reference_date)
        start_30d, _ = cls._window(30, reference_date)

        health_logs = HealthLog.objects.filter(date__range=(start_30d, end_date))
        mood_logs = MoodLog.objects.filter(date__range=(start_30d, end_date))
        spiritual_logs = SpiritualLog.objects.filter(date__range=(start_30d, end_date))
        exercise_logs = HealthLog.objects.filter(date__lte=reference_date)
        mood_streak_logs = MoodLog.objects.filter(date__lte=reference_date)
        prayer_streak_logs = SpiritualLog.objects.filter(date__lte=reference_date)
        spiritual_logs_7d = list(spiritual_logs.filter(date__gte=start_7d))
        today_log = HealthLog.objects.filter(date=reference_date).first()
        today_mood = MoodLog.objects.filter(date=reference_date).first()
        today_spiritual = SpiritualLog.objects.filter(date=reference_date).first()

        prayer_completion_7d = cls._percentage(
            sum(log.prayers_count for log in spiritual_logs_7d),
            7 * 5,
        )
        dhikr_completion_7d = cls._percentage(
            sum(1 for log in spiritual_logs_7d if log.dhikr_done),
            7,
        )
        spiritual_consistency_7d = cls._percentage(
            sum(
                1 for log in spiritual_logs_7d
                if log.prayers_count > 0 or log.quran_pages > 0 or log.dhikr_done
            ),
            7,
        )

        return {
            "date": reference_date.isoformat(),
            "avg_sleep_7d": cls._average(health_logs.filter(date__gte=start_7d), "sleep_hours"),
            "avg_energy_7d": cls._average(health_logs.filter(date__gte=start_7d), "energy_level"),
            "avg_sleep_30d": cls._average(health_logs, "sleep_hours"),
            "avg_mood_7d": cls._average(mood_logs.filter(date__gte=start_7d), "mood_score"),
            "avg_mood_30d": cls._average(mood_logs, "mood_score"),
            "avg_quran_7d": cls._average(spiritual_logs.filter(date__gte=start_7d), "quran_pages"),
            "exercise_streak": cls._streak(exercise_logs, "exercise_done", reference_date),
            "full_prayer_streak": cls._streak(
                prayer_streak_logs.filter(
                    fajr=True, dhuhr=True, asr=True, maghrib=True, isha=True,
                ),
                "fajr",
                reference_date,
            ),
            "habit_completion_rate_7d": cls.overall_habit_completion_rate(7, reference_date),
            "habit_completion_rate_30d": cls.overall_habit_completion_rate(30, reference_date),
            "prayer_completion_rate_7d": prayer_completion_7d,
            "dhikr_completion_rate_7d": dhikr_completion_7d,
            "spiritual_consistency_7d": spiritual_consistency_7d,
            "low_energy_today": bool(today_log and today_log.energy_level <= 2),
            "low_sleep_today": bool(today_log and today_log.sleep_hours < 6),
            "low_mood_today": bool(today_mood and today_mood.mood_score <= 2),
            "low_mood_streak": cls._threshold_streak(mood_streak_logs, "mood_score", 2, reference_date),
            "prayer_gap_streak": cls._prayer_gap_streak(prayer_streak_logs, reference_date),
            "health_logged_today": bool(today_log),
            "mood_logged_today": bool(today_mood),
            "spiritual_logged_today": bool(today_spiritual),
            "active_habits_count": Habit.objects.count(),
            "habits_completed_today": HabitLog.objects.filter(
                date=reference_date,
                done=True,
            ).count(),
        }

    @classmethod
    def today_workspace(cls, reference_date=None):
        """Return the health workspace payload for the current day."""
        reference_date = reference_date or timezone.localdate()
        habits = Habit.objects.select_related("goal").all()
        return {
            "date": reference_date.isoformat(),
            "summary": cls.summary(reference_date),
            "health_log": cls._serialized_today_log(HealthLog, HealthLogSerializer, reference_date),
            "mood_log": cls._serialized_today_log(MoodLog, MoodLogSerializer, reference_date),
            "spiritual_log": cls._serialized_today_log(SpiritualLog, SpiritualLogSerializer, reference_date),
            "habit_board": [
                {
                    "habit": HabitSerializer(habit).data,
                    "today_log": cls._serialized_habit_log(habit, reference_date),
                    "completion_rate_7d": cls.habit_completion_rate(habit, 7, reference_date),
                    "completion_rate_30d": cls.habit_completion_rate(habit, 30, reference_date),
                    "current_streak": cls.habit_streak(habit, reference_date),
                }
                for habit in habits
            ],
        }

    @classmethod
    def overview_payload(cls, reference_date=None):
        """Return the grouped health and body workspace payload."""
        reference_date = reference_date or timezone.localdate()
        summary = cls.summary(reference_date)
        today = cls.today_workspace(reference_date)
        recent_health_logs = [
            HealthLogSerializer(item).data
            for item in HealthLog.objects.order_by("-date")[:7]
        ]
        recent_mood_logs = [
            MoodLogSerializer(item).data
            for item in MoodLog.objects.order_by("-date")[:7]
        ]
        recent_spiritual_logs = [
            SpiritualLogSerializer(item).data
            for item in SpiritualLog.objects.order_by("-date")[:7]
        ]
        capacity_signals = []
        if summary["low_energy_today"]:
            capacity_signals.append("Energy is low today, so lighter execution is more realistic.")
        if summary["low_sleep_today"]:
            capacity_signals.append("Sleep is below the healthy threshold today.")
        if summary["low_mood_today"]:
            capacity_signals.append("Mood is low today, so protect scope and reduce friction.")
        if summary["prayer_gap_streak"] >= 2:
            capacity_signals.append("Spiritual consistency has slipped for multiple days in a row.")
        if not capacity_signals:
            capacity_signals.append("Health signals are stable enough for a normal day.")
        return {
            "date": reference_date.isoformat(),
            "summary": summary,
            "today": today,
            "recent_health_logs": recent_health_logs,
            "recent_mood_logs": recent_mood_logs,
            "recent_spiritual_logs": recent_spiritual_logs,
            "capacity_signals": capacity_signals,
        }

    @staticmethod
    def _serialized_today_log(model_class, serializer_class, reference_date):
        log = model_class.objects.filter(date=reference_date).first()
        return serializer_class(log).data if log else None

    @staticmethod
    def _serialized_habit_log(habit, reference_date):
        log = HabitLog.objects.filter(habit=habit, date=reference_date).first()
        return HabitLogSerializer(log).data if log else None
