"""Serializers for finance entries and summaries."""
from rest_framework import serializers

from finance.models import FinanceEntry
from finance.services import FinanceMetricsService


class FinanceEntrySerializer(serializers.ModelSerializer):
    """Serializer for income and expense records."""

    amount_eur = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FinanceEntry
        fields = "__all__"
        read_only_fields = ["id", "created_at", "amount_eur"]

    def get_amount_eur(self, obj):
        return round(FinanceMetricsService.convert_to_eur(obj.amount, obj.currency), 2)
