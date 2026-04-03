"""MoodLog model — daily mood and mental state tracking.

One entry per day. Cross-module: mood <= 2 for 2+ days contributes
to overwhelm detection; 3+ days triggers burnout flag.
"""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from config.base_model import BaseModel


class MoodLog(BaseModel):
    """Daily mood score with optional notes — one per day."""

    date = models.DateField(unique=True, help_text="One mood log per day.")
    mood_score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Mood rating 1-5.",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"Mood {self.date}: {self.mood_score}/5"
