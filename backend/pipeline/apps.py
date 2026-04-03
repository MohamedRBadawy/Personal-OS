"""App configuration for the Pipeline domain."""
from django.apps import AppConfig


class PipelineConfig(AppConfig):
    """Configuration for the pipeline app — client pipeline & marketing."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "pipeline"
    verbose_name = "Client Pipeline"
