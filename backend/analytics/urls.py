"""URL routing for the Analytics domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from analytics.views import (
    AISuggestionViewSet,
    AchievementViewSet,
    AnalyticsOverviewAPIView,
    DecisionLogViewSet,
    FamilyGoalViewSet,
    IdeaViewSet,
    IdeasOverviewAPIView,
    LearningViewSet,
    OverwhelmAPIView,
    ProjectRetrospectiveViewSet,
    RelationshipViewSet,
    TimelineOverviewAPIView,
    TimelineAPIView,
    WeeklyReviewGenerateAPIView,
    WeeklyReviewPreviewAPIView,
    WeeklyReviewViewSet,
)

router = DefaultRouter()
router.register("suggestions", AISuggestionViewSet, basename="aisuggestion")
router.register("reviews", WeeklyReviewViewSet, basename="weeklyreview")
router.register("relationships", RelationshipViewSet, basename="relationship")
router.register("family-goals", FamilyGoalViewSet, basename="familygoal")
router.register("learnings", LearningViewSet, basename="learning")
router.register("decisions", DecisionLogViewSet, basename="decisionlog")
router.register("achievements", AchievementViewSet, basename="achievement")
router.register("ideas", IdeaViewSet, basename="idea")
router.register("retrospectives", ProjectRetrospectiveViewSet, basename="projectretrospective")

urlpatterns = [
    path("overwhelm/", OverwhelmAPIView.as_view(), name="overwhelm-summary"),
    path("overview/", AnalyticsOverviewAPIView.as_view(), name="analytics-overview"),
    path("timeline/", TimelineAPIView.as_view(), name="analytics-timeline"),
    path("timeline-overview/", TimelineOverviewAPIView.as_view(), name="analytics-timeline-overview"),
    path("ideas-overview/", IdeasOverviewAPIView.as_view(), name="analytics-ideas-overview"),
    path("reviews/generate/", WeeklyReviewGenerateAPIView.as_view(), name="weekly-review-generate"),
    path("reviews/preview/", WeeklyReviewPreviewAPIView.as_view(), name="weekly-review-preview"),
    path("", include(router.urls)),
]
