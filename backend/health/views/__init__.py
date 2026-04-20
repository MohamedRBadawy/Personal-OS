"""Health views package re-exporting CRUD and read-model views."""
from health.views.health_log import HealthLogViewSet
from health.views.habit import HabitViewSet, HabitLogViewSet, HabitHeatmapAPIView
from health.views.mood_log import MoodLogViewSet
from health.views.overview import HealthOverviewAPIView
from health.views.spiritual_log import SpiritualLogViewSet, SpiritualHeatmapAPIView
from health.views.goal_profile import HealthGoalProfileAPIView
from health.views.summary import HealthSummaryAPIView
from health.views.today import HealthTodayAPIView
from health.views.meal import MealPlanViewSet, MealLogViewSet, MealTemplateViewSet, FoodItemViewSet, MealIngredientViewSet
from health.views.workout import WorkoutSessionViewSet, WorkoutExerciseViewSet, SetLogViewSet
from health.views.body_composition import BodyCompositionLogViewSet
from health.views.wearable import WearableLogViewSet
from health.views.ai_health import HealthReadinessAPIView, HealthAIInsightsAPIView

__all__ = [
    "HealthLogViewSet",
    "HabitViewSet",
    "HabitLogViewSet",
    "HabitHeatmapAPIView",
    "MoodLogViewSet",
    "SpiritualLogViewSet",
    "SpiritualHeatmapAPIView",
    "HealthGoalProfileAPIView",
    "HealthSummaryAPIView",
    "HealthTodayAPIView",
    "HealthOverviewAPIView",
    "MealPlanViewSet",
    "MealLogViewSet",
    "MealTemplateViewSet",
    "FoodItemViewSet",
    "MealIngredientViewSet",
    "WorkoutSessionViewSet",
    "WorkoutExerciseViewSet",
    "SetLogViewSet",
    "BodyCompositionLogViewSet",
    "WearableLogViewSet",
    "HealthReadinessAPIView",
    "HealthAIInsightsAPIView",
]
