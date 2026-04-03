"""Abstract base model with UUID primary key for all Personal OS models.

Every model in the system inherits from BaseModel to get a consistent
UUID primary key. Timestamps (created_at, updated_at) are added per-model
since not every model in the spec requires both.
"""
import uuid

from django.db import models


class BaseModel(models.Model):
    """Abstract base providing a UUID primary key to all models."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this record.",
    )

    class Meta:
        abstract = True
