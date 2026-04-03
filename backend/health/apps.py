"""App configuration for the Health domain."""
from django.apps import AppConfig


class HealthConfig(AppConfig):
    """Configuration for the health app — body, habits, mood, spiritual."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "health"
    verbose_name = "Health & Habits"
