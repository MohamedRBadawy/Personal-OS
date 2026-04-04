"""Models for the Finance domain.

Contains finance entries plus named income sources used for target tracking.
"""
from django.db import models

from config.base_model import BaseModel


class FinanceEntry(BaseModel):
    """A single financial transaction."""

    class EntryType(models.TextChoices):
        INCOME = "income", "Income"
        EXPENSE = "expense", "Expense"

    class Currency(models.TextChoices):
        EUR = "EUR", "EUR"
        USD = "USD", "USD"
        EGP = "EGP", "EGP"

    type = models.CharField(max_length=10, choices=EntryType.choices)
    source = models.CharField(
        max_length=255,
        help_text="Source of income or expense category.",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(
        max_length=3,
        choices=Currency.choices,
        default=Currency.EUR,
    )
    is_independent = models.BooleanField(
        default=False,
        help_text="True if this income is NOT from employment (K Line Europe).",
    )
    is_recurring = models.BooleanField(
        default=False,
        help_text="Whether this entry repeats monthly.",
    )
    date = models.DateField(help_text="Date of the transaction.")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "finance entries"

    def __str__(self):
        return f"{self.get_type_display()}: {self.source} - {self.amount} {self.currency}"


class IncomeSource(BaseModel):
    """Named income stream tracked separately from the ledger."""

    name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=64, blank=True)
    monthly_target_eur = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    baseline_amount_eur = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Expected recurring baseline in EUR when applicable.",
    )
    active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-active", "name"]

    def __str__(self):
        return self.name
