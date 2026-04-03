"""Admin configuration for the Schedule domain."""
from django.contrib import admin

from schedule.models import ScheduleTemplate, ScheduleBlock, ScheduleLog


@admin.register(ScheduleTemplate)
class ScheduleTemplateAdmin(admin.ModelAdmin):
    """Admin view for ScheduleTemplate."""
    list_display = ["name", "is_active", "created_at"]


@admin.register(ScheduleBlock)
class ScheduleBlockAdmin(admin.ModelAdmin):
    """Admin view for ScheduleBlock."""
    list_display = ["label", "template", "time", "type", "duration_mins", "is_fixed"]
    list_filter = ["type", "is_fixed", "is_adjustable"]


@admin.register(ScheduleLog)
class ScheduleLogAdmin(admin.ModelAdmin):
    """Admin view for ScheduleLog."""
    list_display = ["date", "block", "status", "task_node"]
    list_filter = ["status"]
