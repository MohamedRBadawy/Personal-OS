"""Wearable / smartwatch daily data log."""
from django.db import models

from config.base_model import BaseModel


class WearableLog(BaseModel):
    """Daily wearable data — designed for future auto-sync, manual entry for now."""

    class Source(models.TextChoices):
        GARMIN      = 'garmin',      'Garmin'
        APPLE_WATCH = 'apple_watch', 'Apple Watch'
        FITBIT      = 'fitbit',      'Fitbit'
        MANUAL      = 'manual',      'Manual'

    date               = models.DateField(
                            unique=True, db_index=True)
    source             = models.CharField(
                            max_length=20, choices=Source.choices,
                            default=Source.MANUAL)
    steps              = models.PositiveIntegerField(
                            null=True, blank=True)
    active_minutes     = models.PositiveSmallIntegerField(
                            null=True, blank=True)
    calories_burned    = models.PositiveIntegerField(
                            null=True, blank=True,
                            help_text="Total daily calories burned (TDEE).")
    calories_active    = models.PositiveIntegerField(
                            null=True, blank=True,
                            help_text="Active (non-resting) calories.")
    resting_heart_rate = models.PositiveSmallIntegerField(
                            null=True, blank=True,
                            help_text="Resting heart rate in bpm.")
    avg_heart_rate     = models.PositiveSmallIntegerField(
                            null=True, blank=True)
    max_heart_rate     = models.PositiveSmallIntegerField(
                            null=True, blank=True)
    hrv_ms             = models.PositiveSmallIntegerField(
                            null=True, blank=True,
                            help_text="Heart Rate Variability in ms — key recovery signal.")
    sleep_score        = models.PositiveSmallIntegerField(
                            null=True, blank=True,
                            help_text="Watch-provided sleep quality score (0–100).")
    spo2_pct           = models.DecimalField(
                            max_digits=5, decimal_places=2, null=True, blank=True,
                            help_text="Blood oxygen saturation %.")
    vo2_max            = models.DecimalField(
                            max_digits=5, decimal_places=2, null=True, blank=True,
                            help_text="VO2 max estimate (ml/kg/min).")
    stress_score       = models.PositiveSmallIntegerField(
                            null=True, blank=True,
                            help_text="Watch-provided stress score (0–100).")
    raw_data           = models.JSONField(
                            default=dict, blank=True,
                            help_text="Full export payload for future parsing.")
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} — {self.get_source_display()} | HRV: {self.hrv_ms or '—'}ms"
