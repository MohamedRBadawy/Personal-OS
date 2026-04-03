"""Admin configuration for the Health domain."""
from django.contrib import admin

from health.models import HealthLog, Habit, HabitLog, MoodLog, SpiritualLog


@admin.register(HealthLog)
class HealthLogAdmin(admin.ModelAdmin):
    """Admin view for HealthLog."""
    list_display = ["date", "sleep_hours", "sleep_quality", "energy_level", "exercise_done"]
    list_filter = ["exercise_done"]


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    """Admin view for Habit definitions."""
    list_display = ["name", "target", "goal"]
    list_filter = ["target"]


@admin.register(HabitLog)
class HabitLogAdmin(admin.ModelAdmin):
    """Admin view for HabitLog entries."""
    list_display = ["habit", "date", "done"]
    list_filter = ["done"]


@admin.register(MoodLog)
class MoodLogAdmin(admin.ModelAdmin):
    """Admin view for MoodLog."""
    list_display = ["date", "mood_score"]


@admin.register(SpiritualLog)
class SpiritualLogAdmin(admin.ModelAdmin):
    """Admin view for SpiritualLog."""
    list_display = ["date", "fajr", "dhuhr", "asr", "maghrib", "isha", "quran_pages"]
