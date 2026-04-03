"""WeeklyReview model — AI-generated weekly reflection reports.

Runs every Sunday pulling data from all modules for the past 7 days.
Mohamed can add personal notes alongside the AI report.
"""
from django.db import models

from config.base_model import BaseModel


class WeeklyReview(BaseModel):
    """A weekly review covering all life domains.

    AI generates a structured report; Mohamed adds personal reflection.
    """

    week_start = models.DateField(help_text="Monday of the review week.")
    week_end = models.DateField(help_text="Sunday of the review week.")
    ai_report = models.TextField(
        blank=True, help_text="AI-generated structured weekly report.",
    )
    personal_notes = models.TextField(
        blank=True, help_text="Mohamed's own reflection on the week.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-week_start"]
        constraints = [
            models.UniqueConstraint(
                fields=["week_start", "week_end"],
                name="analytics_weeklyreview_unique_week_range",
            ),
        ]

    def __str__(self):
        return f"Review: {self.week_start} → {self.week_end}"
