"""HealthLog model — daily physical health tracking.

One entry per day tracking sleep, energy, exercise, weight, and nutrition.
Cross-module: low energy triggers AI deprioritization of deep-focus tasks.
"""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from config.base_model import BaseModel


class HealthLog(BaseModel):
    """Daily health log — one entry per day (date is unique).

    Tracks sleep, energy, exercise, weight, and nutrition.
    """

    date = models.DateField(unique=True, help_text="One log per day.")
    sleep_hours = models.DecimalField(
        max_digits=4, decimal_places=1, help_text="Hours of sleep (e.g. 7.5).",
    )
    sleep_quality = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Sleep quality rating 1-5.",
    )
    energy_level = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Energy level rating 1-5.",
    )
    exercise_done = models.BooleanField(default=False)
    exercise_type = models.CharField(
        max_length=255, blank=True, help_text="E.g. '30min walk', 'gym'.",
    )
    exercise_duration_mins = models.PositiveIntegerField(
        null=True, blank=True, help_text="Duration in minutes.",
    )
    weight_kg = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
    )
    nutrition_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"HealthLog {self.date}"
