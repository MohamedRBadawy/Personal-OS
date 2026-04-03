"""Admin configuration for the Goals domain."""
from django.contrib import admin

from goals.models import Node


@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    """Admin view for Node objects."""

    list_display = ["title", "type", "category", "status", "parent", "created_at"]
    list_filter = ["type", "category", "status"]
    search_fields = ["title", "notes"]
