"""DecisionLog model — records big decisions with full reasoning.

Never deleted — archived for future reference. AI can surface past decisions
when similar situations arise.
"""
from django.db import models

from config.base_model import BaseModel


class DecisionLog(BaseModel):
    """A record of a significant decision with reasoning and outcome."""

    class OutcomeResult(models.TextChoices):
        RIGHT = "right", "Right"
        WRONG = "wrong", "Wrong"
        TOO_EARLY = "too_early", "Too early"

    decision = models.CharField(max_length=255)
    reasoning = models.TextField(help_text="Why this decision was made.")
    alternatives_considered = models.TextField(
        blank=True, help_text="Other options that were evaluated.",
    )
    outcome = models.TextField(
        blank=True, help_text="What actually happened (filled in later).",
    )
    trade_off_cost = models.TextField(
        blank=True,
        help_text="What was deliberately deprioritized by this decision.",
    )
    outcome_date = models.DateField(
        null=True,
        blank=True,
        help_text="When this decision should be reviewed.",
    )
    outcome_result = models.CharField(
        max_length=10,
        blank=True,
        choices=OutcomeResult.choices,
        help_text="Whether the decision proved right, wrong, or too early.",
    )
    enabled_node = models.ForeignKey(
        "goals.Node",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="enabling_decisions",
        help_text="Goal this decision explicitly enabled.",
    )
    killed_node = models.ForeignKey(
        "goals.Node",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="killing_decisions",
        help_text="Goal this decision explicitly deprioritized.",
    )
    date = models.DateField(help_text="When the decision was made.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date}: {self.decision}"
