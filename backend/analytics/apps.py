"""App configuration for the Analytics domain."""
from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """Configuration for the analytics app — AI, reviews, and CRUD modules."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "analytics"
    verbose_name = "Analytics & Modules"
