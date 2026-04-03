"""App configuration for the Finance domain."""
from django.apps import AppConfig


class FinanceConfig(AppConfig):
    """Configuration for the finance app — income and expense tracking."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "finance"
    verbose_name = "Finance"
