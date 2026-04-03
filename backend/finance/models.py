"""Models for the Finance domain.

Contains FinanceEntry — every income or expense record with currency,
independence flag (for Kyrgyzstan trigger), and recurring status.
"""
from django.db import models

from config.base_model import BaseModel


class FinanceEntry(BaseModel):
    """A single financial transaction (income or expense).

    The is_independent flag marks income NOT from K Line Europe employment,
    used to calculate progress toward the €1,000/month Kyrgyzstan trigger.
    """

    class EntryType(models.TextChoices):
        """Whether this entry is income or expense."""
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    class Currency(models.TextChoices):
        """Supported currencies — stored in original, converted to EUR for display."""
        EUR = "EUR", "EUR"
        USD = "USD", "USD"
        EGP = "EGP", "EGP"

    type = models.CharField(max_length=10, choices=EntryType.choices)
    source = models.CharField(
        max_length=255, help_text="Source of income or expense category.",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(
        max_length=3, choices=Currency.choices, default=Currency.EUR,
    )
    is_independent = models.BooleanField(
        default=False,
        help_text="True if this income is NOT from employment (K Line Europe).",
    )
    is_recurring = models.BooleanField(
        default=False, help_text="Whether this entry repeats monthly.",
    )
    date = models.DateField(help_text="Date of the transaction.")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "finance entries"

    def __str__(self):
        return f"{self.get_type_display()}: {self.source} — {self.amount} {self.currency}"
