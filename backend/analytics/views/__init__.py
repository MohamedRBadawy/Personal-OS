# [AR] حزمة مشاهدات التحليلات — تُعيد تصدير جميع الواجهات
# [EN] Analytics views package — re-exports all CRUD and read-model views
from analytics.views.ai_suggestion import AISuggestionViewSet
from analytics.views.crud_models import (
    AchievementViewSet,
    DecisionLogViewSet,
    FamilyGoalViewSet,
    IdeaViewSet,
    LearningViewSet,
    ProjectRetrospectiveViewSet,
    RelationshipViewSet,
    SuggestDomainView,
)
from analytics.views.insights import (
    AnalyticsOverviewAPIView,
    IdeasOverviewAPIView,
    OverwhelmAPIView,
    TimelineOverviewAPIView,
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
    "ProjectRetrospectiveViewSet",
    "SuggestDomainView",
    "OverwhelmAPIView",
    "TimelineAPIView",
    "TimelineOverviewAPIView",
    "IdeasOverviewAPIView",
    "WeeklyReviewGenerateAPIView",
    "WeeklyReviewPreviewAPIView",
]
