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


class FinanceSummary(BaseModel):
    """Singleton financial overview — always use pk=1."""

    income_eur = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Current monthly employment income in EUR.",
    )
    income_sources_text = models.CharField(
        max_length=500, blank=True,
        help_text="Human-readable description of income sources.",
    )
    independent_monthly = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Current monthly independent income in EUR.",
    )
    target_independent = models.DecimalField(
        max_digits=10, decimal_places=2, default=1000,
        help_text="Target monthly independent income in EUR (Kyrgyzstan trigger).",
    )
    income_egp_direct = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Monthly income received directly in EGP (e.g. local salary, freelance). Added on top of EUR income.",
    )
    monthly_expenses_egp = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Monthly expenses in EGP.",
    )
    exchange_rate = models.DecimalField(
        max_digits=7, decimal_places=2, default=60,
        help_text="EUR to EGP exchange rate used for income conversion.",
    )
    notes = models.TextField(blank=True)
    debts = models.JSONField(
        default=list, blank=True,
        help_text="List of debt objects {name, amount_egp}.",
    )
    savings_target_egp = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Target emergency fund amount in EGP.",
    )
    savings_current_egp = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Amount currently saved toward the emergency fund in EGP.",
    )
    monthly_budget_egp = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Optional monthly spending budget in EGP. Enables the budget progress bar.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "finance summary"
        verbose_name_plural = "finance summaries"

    def __str__(self):
        return f"Finance Summary (€{self.independent_monthly}/€{self.target_independent} independent)"

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


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


class IncomeEvent(models.Model):
    """A milestone income event — first client, deal closed, salary raise, etc.

    Used to build an income history log in the Finance workspace.
    """

    date = models.DateField(help_text="Date the income event occurred.")
    source = models.CharField(max_length=255, help_text="Client, deal, or source name.")
    amount_eur = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Amount in EUR (0 if non-monetary milestone).",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date} — {self.source} (€{self.amount_eur})"
