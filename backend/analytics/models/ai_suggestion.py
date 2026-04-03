"""AISuggestion model — tracks AI suggestions shown to the user.

Implements signal discipline: tracks which suggestions were acted on or
dismissed. After 3 ignored suggestions on the same topic, AI stops suggesting.
"""
from django.db import models

from config.base_model import BaseModel


class AISuggestion(BaseModel):
    """An AI-generated suggestion tracked for signal discipline.

    Never repeat the same suggestion in the same week.
    After 3 consecutive ignores on a topic, stop suggesting it.
    """

    topic = models.CharField(
        max_length=255,
        help_text="Topic tag (e.g. 'outreach', 'sleep', 'goals_restructure').",
    )
    module = models.CharField(
        max_length=255, help_text="Which module this suggestion targets.",
    )
    suggestion_text = models.TextField()
    shown_at = models.DateTimeField(auto_now_add=True)
    acted_on = models.BooleanField(default=False)
    dismissed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-shown_at"]

    def __str__(self):
        return f"[{self.module}] {self.topic} — {'Acted' if self.acted_on else 'Pending'}"
