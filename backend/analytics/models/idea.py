"""Idea model — raw thoughts, concepts, and ideas in development.

Ideas can be linked to Goal nodes. Status tracks progression from
raw thought to validated concept or archived.
"""
from django.db import models

from config.base_model import BaseModel


class Idea(BaseModel):
    """A raw thought or concept that may become a project or goal."""

    class Status(models.TextChoices):
        """Progression status of the idea."""
        RAW = "raw", "Raw"
        EXPLORING = "exploring", "Exploring"
        VALIDATED = "validated", "Validated"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=255)
    context = models.TextField(
        blank=True, help_text="Background, inspiration, or initial thinking.",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RAW,
    )
    linked_goal = models.ForeignKey(
        "goals.Node", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ideas", help_text="Goal this idea connects to.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
