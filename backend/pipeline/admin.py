"""Admin configuration for the Pipeline domain."""
from django.contrib import admin

from pipeline.models import (
    Client, EquityPartnership, MarketingAction, Opportunity,
    OutreachStep, PartnershipAction,
)


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


@admin.register(OutreachStep)
class OutreachStepAdmin(admin.ModelAdmin):
    """Admin view for OutreachStep records."""

    list_display = ["opportunity", "step_type", "date", "created_at"]
    list_filter = ["step_type"]
    search_fields = ["opportunity__name", "notes"]


@admin.register(EquityPartnership)
class EquityPartnershipAdmin(admin.ModelAdmin):
    """Admin view for EquityPartnership records."""

    list_display = ["business_name", "partner_name", "equity_pct", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["business_name", "partner_name"]


@admin.register(PartnershipAction)
class PartnershipActionAdmin(admin.ModelAdmin):
    """Admin view for PartnershipAction records."""

    list_display = ["description", "partnership", "is_current_next_action", "completed_at"]
    list_filter = ["is_current_next_action"]
