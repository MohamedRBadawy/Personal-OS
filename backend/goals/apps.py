"""App configuration for the Goals domain."""
from django.apps import AppConfig


class GoalsConfig(AppConfig):
    """Configuration for the goals app — node hierarchy management."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "goals"
    verbose_name = "Goals & Life Plan"
