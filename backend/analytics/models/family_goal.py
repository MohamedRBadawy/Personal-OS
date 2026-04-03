"""FamilyGoal model — shared milestones involving the whole family.

Simple CRUD with no cross-module triggers.
"""
from django.db import models

from config.base_model import BaseModel


class FamilyGoal(BaseModel):
    """A family-level milestone or goal (e.g. children's development)."""

    class Status(models.TextChoices):
        """Status of the family goal."""
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        ON_HOLD = "on_hold", "On Hold"

    title = models.CharField(max_length=255)
    who_involved = models.CharField(
        max_length=255, help_text="Family members involved.",
    )
    target_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
