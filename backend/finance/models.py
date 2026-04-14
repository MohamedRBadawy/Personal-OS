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

    class Category(models.TextChoices):
        FOOD = "food", "Food & Groceries"
        HOUSING = "housing", "Housing & Rent"
        TRANSPORT = "transport", "Transport"
        UTILITIES = "utilities", "Utilities & Bills"
        EDUCATION = "education", "Education"
        CHILDREN = "children", "Children"
        HEALTH = "health", "Health"
        DEBT_PAYMENT = "debt_payment", "Debt Payment"
        BUSINESS = "business", "Business"
        SAVINGS = "savings", "Savings"
        OTHER = "other", "Other"
        INCOME_EMPLOYMENT = "income_employment", "Employment Income"
        INCOME_INDEPENDENT = "income_independent", "Independent Income"
        INCOME_OTHER = "income_other", "Other Income"

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
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        blank=True,
        default="",
        help_text="Spending or income category.",
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
    category_budgets = models.JSONField(
        default=dict, blank=True,
        help_text="Monthly budget per category in EGP: {category: amount}.",
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


class DebtEntry(BaseModel):
    """A single debt being tracked and paid off."""

    creditor         = models.CharField(max_length=200, help_text="Who is owed the money.")
    original_amount  = models.DecimalField(max_digits=12, decimal_places=2,
                                           help_text="Original debt amount in EGP.")
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2,
                                           help_text="Current remaining balance in EGP.")
    monthly_payment  = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                           help_text="Planned monthly payment in EGP.")
    paid_off         = models.BooleanField(default=False)
    priority         = models.IntegerField(default=0, help_text="Payoff priority order (lowest = pay first).")
    notes            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["paid_off", "priority", "remaining_amount"]

    def __str__(self):
        return f"{self.creditor}: {self.remaining_amount} EGP"


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


class MonthlyBudgetPlan(models.Model):
    """Per-month budget plan — stores planned spend per category for a given month."""

    month = models.CharField(
        max_length=7, primary_key=True,
        help_text="Month in YYYY-MM format.",
    )
    planned_budgets = models.JSONField(
        default=dict, blank=True,
        help_text="Planned spend per category in EGP: {category: amount}.",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-month"]

    def __str__(self):
        return f"Budget Plan {self.month}"


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
