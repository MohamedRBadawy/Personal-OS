"""Derived finance calculations and goal synchronization."""
from datetime import timedelta
from decimal import Decimal, ROUND_CEILING

from django.utils import timezone

from core.models import AppSettings
from finance.models import FinanceEntry
from goals.services import NodeStatusService


class FinanceMetricsService:
    """Calculates summary finance metrics using fixed app settings."""

    @staticmethod
    def app_settings():
        return AppSettings.get_solo()

    @classmethod
    def convert_to_eur(cls, amount, currency):
        """Convert a stored amount into EUR using fixed settings rates."""
        settings_obj = cls.app_settings()
        amount = Decimal(amount)
        if currency == FinanceEntry.Currency.EUR:
            return amount
        if currency == FinanceEntry.Currency.USD:
            return amount / settings_obj.eur_to_usd_rate
        if currency == FinanceEntry.Currency.EGP:
            return amount / settings_obj.eur_to_egp_rate
        return amount

    @staticmethod
    def month_window(reference_date):
        month_start = reference_date.replace(day=1)
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1)
        return month_start, next_month

    @classmethod
    def _sum_entries(cls, entries):
        total = Decimal("0")
        for entry in entries:
            total += cls.convert_to_eur(entry.amount, entry.currency)
        return total

    @classmethod
    def _monthly_independent_income(cls, month_start):
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        entries = FinanceEntry.objects.filter(
            type=FinanceEntry.EntryType.INCOME,
            is_independent=True,
            date__gte=month_start,
            date__lt=next_month,
        )
        return cls._sum_entries(entries)

    @classmethod
    def summary(cls, reference_date=None):
        """Return the current-month finance dashboard metrics."""
        reference_date = reference_date or timezone.localdate()
        month_start, next_month = cls.month_window(reference_date)
        current_month = FinanceEntry.objects.filter(date__gte=month_start, date__lt=next_month)

        income_entries = current_month.filter(type=FinanceEntry.EntryType.INCOME)
        expense_entries = current_month.filter(type=FinanceEntry.EntryType.EXPENSE)
        independent_entries = income_entries.filter(is_independent=True)

        total_income = cls._sum_entries(income_entries)
        total_expense = cls._sum_entries(expense_entries)
        independent_income = cls._sum_entries(independent_entries)
        net = total_income - total_expense

        settings_obj = cls.app_settings()
        target = Decimal(settings_obj.independent_income_target_eur)
        progress = Decimal("0") if target == 0 else min(Decimal("100"), (independent_income / target) * 100)

        month_starts = [
            (month_start - timedelta(days=offset)).replace(day=1)
            for offset in (0, 32, 64)
        ]
        rolling_values = [cls._monthly_independent_income(item) for item in month_starts]
        average_income = sum(rolling_values, Decimal("0")) / Decimal(len(rolling_values))
        months_to_target = None
        if independent_income >= target:
            months_to_target = 0
        elif average_income > 0:
            remaining = max(target - independent_income, Decimal("0"))
            months_to_target = int(
                (remaining / average_income).to_integral_value(rounding=ROUND_CEILING),
            )
            if months_to_target == 0 and remaining > 0:
                months_to_target = 1

        return {
            "month": month_start.isoformat(),
            "total_income_eur": round(total_income, 2),
            "total_expense_eur": round(total_expense, 2),
            "independent_income_eur": round(independent_income, 2),
            "net_eur": round(net, 2),
            "kyrgyzstan_progress_pct": round(progress, 2),
            "months_to_target": months_to_target,
            "target_eur": settings_obj.independent_income_target_eur,
            "eur_to_usd_rate": settings_obj.eur_to_usd_rate,
            "eur_to_egp_rate": settings_obj.eur_to_egp_rate,
        }

    @classmethod
    def sync_goal_status(cls):
        """Keep the seeded finance-dependent goal in sync with finance data."""
        settings_obj = cls.app_settings()
        summary = cls.summary()
        NodeStatusService.sync_kyrgyzstan_goal(
            settings_obj,
            Decimal(summary["independent_income_eur"]),
        )
