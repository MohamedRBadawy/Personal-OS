"""App configuration for shared Personal OS models and APIs."""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Registers the shared core app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
