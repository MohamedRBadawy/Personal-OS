"""URL routing for the Health domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from health.views import (
    HealthLogViewSet,
    HealthOverviewAPIView,
    HabitViewSet,
    HabitLogViewSet,
    HabitHeatmapAPIView,
    HealthSummaryAPIView,
    HealthTodayAPIView,
    MoodLogViewSet,
    SpiritualLogViewSet,
    SpiritualHeatmapAPIView,
    MealPlanViewSet,
    MealLogViewSet,
    MealTemplateViewSet,
    FoodItemViewSet,
    MealIngredientViewSet,
    WorkoutSessionViewSet,
    WorkoutExerciseViewSet,
    SetLogViewSet,
    BodyCompositionLogViewSet,
    WearableLogViewSet,
    HealthReadinessAPIView,
    HealthAIInsightsAPIView,
)

router = DefaultRouter()
router.register("logs", HealthLogViewSet, basename="healthlog")
router.register("habits", HabitViewSet, basename="habit")
router.register("habit-logs", HabitLogViewSet, basename="habitlog")
router.register("moods", MoodLogViewSet, basename="moodlog")
router.register("spiritual", SpiritualLogViewSet, basename="spirituallog")
router.register("meal-plans",       MealPlanViewSet,       basename="mealplan")
router.register("meal-logs",        MealLogViewSet,        basename="meallog")
router.register("meal-templates",   MealTemplateViewSet,   basename="mealtemplate")
router.register("food-items",       FoodItemViewSet,       basename="fooditem")
router.register("meal-ingredients", MealIngredientViewSet, basename="mealingredient")
# New: workout engine, body composition, wearable
router.register("workout-sessions",   WorkoutSessionViewSet,    basename="workoutsession")
router.register("workout-exercises",  WorkoutExerciseViewSet,   basename="workoutexercise")
router.register("set-logs",           SetLogViewSet,            basename="setlog")
router.register("body-composition",   BodyCompositionLogViewSet, basename="bodycomposition")
router.register("wearable-logs",      WearableLogViewSet,       basename="wearablelog")

urlpatterns = [
    path("overview/", HealthOverviewAPIView.as_view(), name="health-overview"),
    path("summary/", HealthSummaryAPIView.as_view(), name="health-summary"),
    path("today/", HealthTodayAPIView.as_view(), name="health-today"),
    path("habit-heatmap/", HabitHeatmapAPIView.as_view(), name="habit-heatmap"),
    path("spiritual-heatmap/", SpiritualHeatmapAPIView.as_view(), name="spiritual-heatmap"),
    path("readiness/",    HealthReadinessAPIView.as_view(),   name="health-readiness"),
    path("ai-insights/",  HealthAIInsightsAPIView.as_view(),  name="health-ai-insights"),
    path("", include(router.urls)),
]
