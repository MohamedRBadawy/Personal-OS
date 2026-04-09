"""Serializers for finance entries and summaries."""
from rest_framework import serializers

from finance.models import FinanceEntry, FinanceSummary, IncomeEvent, IncomeSource
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
