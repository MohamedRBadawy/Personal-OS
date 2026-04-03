"""App configuration for the Schedule domain."""
from django.apps import AppConfig


class ScheduleConfig(AppConfig):
    """Configuration for the schedule app — daily time blocking."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "schedule"
    verbose_name = "Daily Schedule"
