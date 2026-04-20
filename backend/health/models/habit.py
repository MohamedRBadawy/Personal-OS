"""Habit and HabitLog models — recurring habit definitions and daily tracking.

Habits can be linked to Goal nodes. HabitLog records daily completion.
Cross-module: completion rate below 50% contributes to overwhelm detection.
"""
from django.db import models

from config.base_model import BaseModel


class Habit(BaseModel):
    """A recurring habit definition (e.g. 'Cold shower', 'Post on LinkedIn').

    Can optionally link to a Goal node — completion rate shows on that goal's card.
    """

    class Target(models.TextChoices):
        """How often this habit should be done."""
        DAILY = "daily", "Daily"
        THREE_X_WEEK = "3x_week", "3x per week"
        WEEKLY = "weekly", "Weekly"
        CUSTOM = "custom", "Custom"

    class HealthDomain(models.TextChoices):
        SLEEP = "sleep", "Sleep"
        MOVEMENT = "movement", "Movement"
        NUTRITION = "nutrition", "Nutrition"
        RECOVERY = "recovery", "Recovery"
        MENTAL = "mental", "Mental"
        GENERAL = "general", "General"

    name = models.CharField(max_length=255)
    target = models.CharField(max_length=20, choices=Target.choices)
    custom_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Number of days per week if target is 'custom'.",
    )
    goal = models.ForeignKey(
        "goals.Node", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="habits", help_text="Optional linked goal node.",
    )
    health_domain = models.CharField(
        max_length=20,
        choices=HealthDomain.choices,
        default=HealthDomain.GENERAL,
        help_text="Which health pillar this habit supports, if any.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class HabitLog(BaseModel):
    """Daily log entry for a single habit — tracks completion per day.

    Unique together on (habit, date) to enforce one log per habit per day.
    """

    habit = models.ForeignKey(
        Habit, on_delete=models.CASCADE, related_name="logs",
    )
    date = models.DateField()
    done = models.BooleanField(default=False)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("habit", "date")]
        ordering = ["-date"]

    def __str__(self):
        status = "Done" if self.done else "Missed"
        return f"{self.habit.name} — {self.date} — {status}"
