"""Admin configuration for shared core models."""
from django.contrib import admin

from core.models import AppSettings, DailyCheckIn, Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """Admin view for the static user profile."""

    list_display = ["full_name", "location", "timezone", "updated_at"]
    search_fields = ["full_name", "background", "cognitive_style"]


@admin.register(AppSettings)
class AppSettingsAdmin(admin.ModelAdmin):
    """Admin view for application settings."""

    list_display = ["name", "independent_income_target_eur", "timezone", "updated_at"]


@admin.register(DailyCheckIn)
class DailyCheckInAdmin(admin.ModelAdmin):
    """Admin view for check-ins."""

    list_display = ["date", "created_at"]
    search_fields = ["inbox_text", "blockers_text", "briefing_text"]
