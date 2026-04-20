"""Persisted whole-person health goal profile."""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from config.base_model import BaseModel


class HealthGoalProfile(BaseModel):
    """Singleton-ish app-wide health goal configuration."""

    class Goal(models.TextChoices):
        SLEEP_ENERGY = "sleep_energy", "Sleep & energy"
        STRENGTH = "strength", "Strength"
        BODY_COMPOSITION = "body_composition", "Body composition"
        NUTRITION = "nutrition", "Nutrition"
        MOOD_STABILITY = "mood_stability", "Mood stability"
        CONSISTENCY = "consistency", "Consistency"
        SPIRITUAL_CONSISTENCY = "spiritual_consistency", "Spiritual consistency"

    class BodyGoal(models.TextChoices):
        LOSE_FAT = "lose_fat", "Lose fat"
        MAINTAIN = "maintain", "Maintain"
        GAIN_MUSCLE = "gain_muscle", "Gain muscle"

    primary_goals = models.JSONField(
        default=list,
        blank=True,
        help_text="Up to 3 selected primary health goals.",
    )
    sleep_hours_target = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=7.5,
        validators=[MinValueValidator(4), MaxValueValidator(12)],
    )
    weekly_workouts_target = models.PositiveIntegerField(
        default=4,
        validators=[MinValueValidator(1), MaxValueValidator(14)],
    )
    protein_g_target = models.PositiveIntegerField(
        default=150,
        validators=[MinValueValidator(40), MaxValueValidator(350)],
    )
    body_goal = models.CharField(
        max_length=20,
        choices=BodyGoal.choices,
        default=BodyGoal.MAINTAIN,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "health goal profile"
        verbose_name_plural = "health goal profiles"

    def __str__(self):
        return "Health goal profile"

    @classmethod
    def defaults(cls):
        return {
            "primary_goals": [
                cls.Goal.SLEEP_ENERGY,
                cls.Goal.STRENGTH,
                cls.Goal.NUTRITION,
            ],
            "sleep_hours_target": "7.5",
            "weekly_workouts_target": 4,
            "protein_g_target": 150,
            "body_goal": cls.BodyGoal.MAINTAIN,
        }

    @classmethod
    def get_solo(cls):
        profile = cls.objects.order_by("created_at", "id").first()
        if profile:
            return profile
        return cls.objects.create(**cls.defaults())
