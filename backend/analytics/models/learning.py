"""Learning model — books, courses, and skills in development.

Can optionally link to a Goal node. Simple CRUD with no complex triggers.
"""
from django.db import models

from config.base_model import BaseModel


class Learning(BaseModel):
    """A learning item — book, course, or skill being developed."""

    class Status(models.TextChoices):
        """Progress status of this learning item."""
        NOT_STARTED = "not_started", "Not Started"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    topic = models.CharField(max_length=255)
    source = models.CharField(
        max_length=255, help_text="Book title, course name, resource URL, etc.",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NOT_STARTED,
    )
    key_insights = models.TextField(
        blank=True, help_text="Key takeaways and notes.",
    )
    linked_goal = models.ForeignKey(
        "goals.Node", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="learnings", help_text="Goal this learning supports.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.topic} ({self.get_status_display()})"
