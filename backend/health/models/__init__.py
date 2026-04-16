"""Health models package — re-exports all models for Django discovery.

Split into separate files to stay under the 150-line limit:
- health_log.py: Daily health tracking
- habit.py: Habit definitions and daily logs
- mood_log.py: Daily mood scoring
- spiritual_log.py: Prayer and Quran tracking
"""
from health.models.health_log import HealthLog
from health.models.habit import Habit, HabitLog
from health.models.mood_log import MoodLog
from health.models.spiritual_log import SpiritualLog
from health.models.meal import MealPlan, MealLog, MealTemplate, FoodItem, MealIngredient
from health.models.workout import WorkoutSession, WorkoutExercise, SetLog
from health.models.body_composition import BodyCompositionLog
from health.models.wearable import WearableLog

__all__ = [
    "HealthLog",
    "Habit",
    "HabitLog",
    "MoodLog",
    "SpiritualLog",
    "MealPlan",
    "MealLog",
    "MealTemplate",
    "FoodItem",
    "MealIngredient",
    "WorkoutSession",
    "WorkoutExercise",
    "SetLog",
    "BodyCompositionLog",
    "WearableLog",
]
