"""DecisionLog model — records big decisions with full reasoning.

Never deleted — archived for future reference. AI can surface past decisions
when similar situations arise.
"""
from django.db import models

from config.base_model import BaseModel


class DecisionLog(BaseModel):
    """A record of a significant decision with reasoning and outcome."""

    decision = models.CharField(max_length=255)
    reasoning = models.TextField(help_text="Why this decision was made.")
    alternatives_considered = models.TextField(
        blank=True, help_text="Other options that were evaluated.",
    )
    outcome = models.TextField(
        blank=True, help_text="What actually happened (filled in later).",
    )
    date = models.DateField(help_text="When the decision was made.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date}: {self.decision}"
