"""Serializers for finance entries and summaries."""
from rest_framework import serializers

from finance.models import DebtEntry, FinanceEntry, FinanceSummary, IncomeEvent, IncomeSource, MonthlyBudgetPlan
from finance.services import FinanceMetricsService


class FinanceEntrySerializer(serializers.ModelSerializer):
    """Serializer for income and expense records."""

    amount_eur = serializers.SerializerMethodField(read_only=True)
    amount_egp = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FinanceEntry
        fields = "__all__"
        read_only_fields = ["id", "created_at", "amount_eur", "amount_egp"]

    def get_amount_eur(self, obj):
        return round(float(FinanceMetricsService.convert_to_eur(obj.amount, obj.currency)), 2)

    def get_amount_egp(self, obj):
        return round(float(FinanceMetricsService.convert_to_egp(obj.amount, obj.currency)), 2)


class FinanceSummarySerializer(serializers.ModelSerializer):
    """Serializer for the singleton finance summary."""

    surplus_egp = serializers.SerializerMethodField(read_only=True)
    income_egp = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FinanceSummary
        fields = [
            "id", "income_eur", "income_egp_direct", "income_sources_text",
            "independent_monthly", "target_independent", "monthly_expenses_egp",
            "exchange_rate", "notes", "debts",
            "savings_target_egp", "savings_current_egp",
            "monthly_budget_egp", "category_budgets",
            "surplus_egp", "income_egp", "updated_at",
        ]
        read_only_fields = ["id", "updated_at", "surplus_egp", "income_egp"]

    def get_surplus_egp(self, obj):
        rate = float(obj.exchange_rate)
        income_egp = float(obj.income_eur) * rate + float(obj.income_egp_direct)
        return round(income_egp - float(obj.monthly_expenses_egp), 2)

    def get_income_egp(self, obj):
        rate = float(obj.exchange_rate)
        return round(float(obj.income_eur) * rate + float(obj.income_egp_direct), 2)


class IncomeSourceSerializer(serializers.ModelSerializer):
    """Serializer for recurring or strategic income streams."""

    class Meta:
        model = IncomeSource
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class IncomeEventSerializer(serializers.ModelSerializer):
    """Serializer for milestone income history events."""

    class Meta:
        model = IncomeEvent
        fields = ["id", "date", "source", "amount_eur", "notes", "created_at"]
        read_only_fields = ["id", "created_at"]


class MonthlyBudgetPlanSerializer(serializers.ModelSerializer):
    """Serializer for per-month budget plans."""

    class Meta:
        model = MonthlyBudgetPlan
        fields = ["month", "planned_budgets", "notes", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def validate_month(self, value):
        import re
        if not re.fullmatch(r"\d{4}-\d{2}", value):
            raise serializers.ValidationError("Month must be in YYYY-MM format.")
        return value


class DebtEntrySerializer(serializers.ModelSerializer):
    """Serializer for individual debt entries."""

    paid_pct = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DebtEntry
        fields = [
            "id", "creditor", "original_amount", "remaining_amount",
            "monthly_payment", "paid_off", "priority", "notes",
            "created_at", "updated_at", "paid_pct",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "paid_pct"]

    def get_paid_pct(self, obj):
        if not obj.original_amount:
            return 0
        paid = float(obj.original_amount) - float(obj.remaining_amount)
        return round(max(0, paid / float(obj.original_amount) * 100), 1)
