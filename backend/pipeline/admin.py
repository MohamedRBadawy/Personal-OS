"""Admin configuration for the Pipeline domain."""
from django.contrib import admin

from pipeline.models import Client, MarketingAction, Opportunity


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """Admin view for Client records."""

    list_display = ["name", "source_platform", "created_at"]
    search_fields = ["name", "notes"]


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    """Admin view for Opportunity records."""

    list_display = ["name", "platform", "status", "fit_score", "budget", "date_found"]
    list_filter = ["platform", "status"]
    search_fields = ["name", "description"]


@admin.register(MarketingAction)
class MarketingActionAdmin(admin.ModelAdmin):
    """Admin view for MarketingAction records."""

    list_display = ["action", "platform", "date", "follow_up_date", "follow_up_done"]
    list_filter = ["follow_up_done"]
    search_fields = ["action", "platform"]
