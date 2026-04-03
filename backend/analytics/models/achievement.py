"""Achievement model — permanent record of wins and milestones.

Never deleted — forms Mohamed's progress timeline.
"""
from django.db import models

from config.base_model import BaseModel


class Achievement(BaseModel):
    """A recorded win, milestone, or completed goal."""

    title = models.CharField(max_length=255)
    domain = models.CharField(
        max_length=255, help_text="Life domain (e.g. Career, Health, Spiritual).",
    )
    date = models.DateField(help_text="When this achievement happened.")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date}: {self.title}"
