"""Body composition log — InBody scans and manual snapshots."""
from django.db import models

from config.base_model import BaseModel


class BodyCompositionLog(BaseModel):
    """Periodic body composition snapshot — InBody scan or manual entry."""

    class Source(models.TextChoices):
        INBODY   = 'inbody',   'InBody Scan'
        MANUAL   = 'manual',   'Manual Entry'
        ESTIMATE = 'estimate', 'Estimate'

    date               = models.DateField(
                            unique=True, db_index=True,
                            help_text="Date of the scan or measurement.")
    weight_kg          = models.DecimalField(
                            max_digits=5, decimal_places=2,
                            help_text="Total body weight in kg.")
    body_fat_pct       = models.DecimalField(
                            max_digits=5, decimal_places=2, null=True, blank=True,
                            help_text="Body fat percentage.")
    muscle_mass_kg     = models.DecimalField(
                            max_digits=5, decimal_places=2, null=True, blank=True,
                            help_text="Skeletal muscle mass in kg.")
    fat_mass_kg        = models.DecimalField(
                            max_digits=5, decimal_places=2, null=True, blank=True,
                            help_text="Total fat mass in kg.")
    visceral_fat_level = models.PositiveSmallIntegerField(
                            null=True, blank=True,
                            help_text="InBody visceral fat level (1–20 scale).")
    body_water_pct     = models.DecimalField(
                            max_digits=5, decimal_places=2, null=True, blank=True,
                            help_text="Total body water percentage.")
    bmi                = models.DecimalField(
                            max_digits=5, decimal_places=2, null=True, blank=True,
                            help_text="Body Mass Index.")
    metabolic_age      = models.PositiveSmallIntegerField(
                            null=True, blank=True,
                            help_text="Metabolic age as reported by InBody.")
    source             = models.CharField(
                            max_length=20, choices=Source.choices,
                            default=Source.INBODY)
    notes              = models.TextField(blank=True)
    raw_data           = models.JSONField(
                            default=dict, blank=True,
                            help_text="Full InBody export data for future parsing.")
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        fat_str = f" | {self.body_fat_pct}% fat" if self.body_fat_pct else ""
        return f"{self.date} — {self.weight_kg}kg{fat_str}"
