"""Workout session models — detailed exercise tracking."""
from django.db import models

from config.base_model import BaseModel


class WorkoutSession(BaseModel):
    """One training session — a container for exercises and sets."""

    class SessionType(models.TextChoices):
        STRENGTH = 'strength', 'Strength'
        CARDIO   = 'cardio',   'Cardio'
        SWIMMING = 'swimming', 'Swimming'
        YOGA     = 'yoga',     'Yoga'
        OTHER    = 'other',    'Other'

    date          = models.DateField(db_index=True)
    title         = models.CharField(max_length=255, blank=True,
                       help_text="Optional label, e.g. 'Push day A'.")
    session_type  = models.CharField(
                       max_length=20, choices=SessionType.choices,
                       default=SessionType.STRENGTH)
    duration_mins = models.PositiveIntegerField(
                       null=True, blank=True,
                       help_text="Total session duration in minutes.")
    notes         = models.TextField(blank=True)
    # Soft link to HealthLog for the same day — optional so missing logs don't block workouts
    health_log    = models.ForeignKey(
                       'health.HealthLog', null=True, blank=True,
                       on_delete=models.SET_NULL, related_name='workout_sessions')
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        label = self.title or self.get_session_type_display()
        return f"{self.date} — {label}"


class WorkoutExercise(BaseModel):
    """One exercise within a WorkoutSession (e.g. 'Lat Pulldown')."""

    class Category(models.TextChoices):
        COMPOUND    = 'compound',    'Compound'
        ISOLATION   = 'isolation',   'Isolation'
        CARDIO      = 'cardio',      'Cardio'
        FLEXIBILITY = 'flexibility', 'Flexibility'

    class MuscleGroup(models.TextChoices):
        CHEST      = 'chest',      'Chest'
        BACK       = 'back',       'Back'
        SHOULDERS  = 'shoulders',  'Shoulders'
        BICEPS     = 'biceps',     'Biceps'
        TRICEPS    = 'triceps',    'Triceps'
        CORE       = 'core',       'Core'
        GLUTES     = 'glutes',     'Glutes'
        QUADS      = 'quads',      'Quads'
        HAMSTRINGS = 'hamstrings', 'Hamstrings'
        CALVES     = 'calves',     'Calves'

    session  = models.ForeignKey(
                  WorkoutSession, on_delete=models.CASCADE, related_name='exercises')
    name     = models.CharField(max_length=255,
                  help_text="Exercise name — stored title-cased.")
    category = models.CharField(
                  max_length=20, choices=Category.choices,
                  default=Category.COMPOUND)
    order    = models.PositiveSmallIntegerField(
                  default=0, help_text="Display order within the session.")
    notes    = models.TextField(blank=True)
    primary_muscle    = models.CharField(
                           max_length=20, choices=MuscleGroup.choices,
                           blank=True, default='',
                           help_text="Primary muscle group targeted by this exercise.")
    secondary_muscles = models.JSONField(
                           default=list, blank=True,
                           help_text="List of secondary muscle group keys.")

    class Meta:
        ordering = ['session', 'order']

    def __str__(self):
        return f"{self.session.date} — {self.name}"


class SetLog(BaseModel):
    """One set within a WorkoutExercise."""

    exercise      = models.ForeignKey(
                       WorkoutExercise, on_delete=models.CASCADE, related_name='sets')
    set_number    = models.PositiveSmallIntegerField(default=1)
    # Strength fields
    reps          = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_kg     = models.DecimalField(
                       max_digits=6, decimal_places=2, null=True, blank=True,
                       help_text="Weight used in kg.")
    # Cardio / endurance fields
    duration_secs = models.PositiveIntegerField(
                       null=True, blank=True,
                       help_text="Duration in seconds (for timed sets).")
    distance_km   = models.DecimalField(
                       max_digits=6, decimal_places=3, null=True, blank=True,
                       help_text="Distance in km (for cardio exercises).")
    notes         = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['exercise', 'set_number']

    def __str__(self):
        parts = [f"Set {self.set_number}"]
        if self.weight_kg and self.reps:
            parts.append(f"{self.weight_kg}kg × {self.reps}")
        elif self.distance_km:
            parts.append(f"{self.distance_km}km")
        elif self.duration_secs:
            parts.append(f"{self.duration_secs}s")
        return " — ".join(parts)
