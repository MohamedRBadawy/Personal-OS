"""Analytics views package re-exporting CRUD and read-model views."""
from analytics.views.ai_suggestion import AISuggestionViewSet
from analytics.views.crud_models import (
    AchievementViewSet,
    DecisionLogViewSet,
    FamilyGoalViewSet,
    IdeaViewSet,
    LearningViewSet,
    RelationshipViewSet,
)
from analytics.views.insights import (
    AnalyticsOverviewAPIView,
    OverwhelmAPIView,
    TimelineAPIView,
    WeeklyReviewPreviewAPIView,
)
from analytics.views.weekly_review import WeeklyReviewGenerateAPIView, WeeklyReviewViewSet

__all__ = [
    "AISuggestionViewSet",
    "AnalyticsOverviewAPIView",
    "WeeklyReviewViewSet",
    "RelationshipViewSet",
    "FamilyGoalViewSet",
    "LearningViewSet",
    "DecisionLogViewSet",
    "AchievementViewSet",
    "IdeaViewSet",
    "OverwhelmAPIView",
    "TimelineAPIView",
    "WeeklyReviewGenerateAPIView",
    "WeeklyReviewPreviewAPIView",
]
