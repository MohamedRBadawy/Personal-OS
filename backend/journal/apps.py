"""App configuration for the Journal domain."""
from django.apps import AppConfig


class JournalConfig(AppConfig):
    """Configuration for the journal app — daily reflection and notes."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "journal"
    verbose_name = "Journal"
