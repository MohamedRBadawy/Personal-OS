"""Admin configuration for the Finance domain."""
from django.contrib import admin

from finance.models import FinanceEntry


@admin.register(FinanceEntry)
class FinanceEntryAdmin(admin.ModelAdmin):
    """Admin view for FinanceEntry records."""

    list_display = ["source", "type", "amount", "currency", "is_independent", "date"]
    list_filter = ["type", "currency", "is_independent", "is_recurring"]
    search_fields = ["source", "notes"]
