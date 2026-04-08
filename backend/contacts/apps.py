"""App configuration for the Contacts domain."""
from django.apps import AppConfig


class ContactsConfig(AppConfig):
    """Configuration for the contacts app — relationship management."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "contacts"
    verbose_name = "Contacts"
