"""Admin configuration for the Analytics domain."""
from django.contrib import admin

from analytics.models import (
    AISuggestion,
    WeeklyReview,
    Relationship,
    FamilyGoal,
    Learning,
    DecisionLog,
    Achievement,
    Idea,
)


@admin.register(AISuggestion)
class AISuggestionAdmin(admin.ModelAdmin):
    """Admin view for AISuggestion."""
    list_display = ["topic", "module", "shown_at", "acted_on"]
    list_filter = ["acted_on", "module"]


@admin.register(WeeklyReview)
class WeeklyReviewAdmin(admin.ModelAdmin):
    """Admin view for WeeklyReview."""
    list_display = ["week_start", "week_end", "created_at"]


@admin.register(Relationship)
class RelationshipAdmin(admin.ModelAdmin):
    """Admin view for Relationship."""
    list_display = ["name", "relationship_type", "last_contact"]


@admin.register(FamilyGoal)
class FamilyGoalAdmin(admin.ModelAdmin):
    """Admin view for FamilyGoal."""
    list_display = ["title", "status", "target_date"]
    list_filter = ["status"]


@admin.register(Learning)
class LearningAdmin(admin.ModelAdmin):
    """Admin view for Learning."""
    list_display = ["topic", "source", "status", "linked_goal"]
    list_filter = ["status"]


@admin.register(DecisionLog)
class DecisionLogAdmin(admin.ModelAdmin):
    """Admin view for DecisionLog."""
    list_display = ["decision", "date"]


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    """Admin view for Achievement."""
    list_display = ["title", "domain", "date"]


@admin.register(Idea)
class IdeaAdmin(admin.ModelAdmin):
    """Admin view for Idea."""
    list_display = ["title", "status", "linked_goal"]
    list_filter = ["status"]
