"""Shared persistence for Personal OS."""
import os
from decimal import Decimal, InvalidOperation

from django.db import models

from config.base_model import BaseModel


class Profile(BaseModel):
    """Static personal context loaded into the app at setup time."""

    full_name = models.CharField(max_length=255)
    birth_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    timezone = models.CharField(max_length=64, default="Africa/Cairo")
    background = models.TextField(blank=True)
    cognitive_style = models.TextField(blank=True)
    family_context = models.TextField(blank=True)
    life_focus = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class AppSettings(BaseModel):
    """Application-wide configuration and fixed business constants."""

    name = models.CharField(max_length=255, default="Default Settings")
    eur_to_usd_rate = models.DecimalField(max_digits=10, decimal_places=4, default=1.08)
    eur_to_egp_rate = models.DecimalField(max_digits=10, decimal_places=4, default=33.50)
    independent_income_target_eur = models.DecimalField(
        max_digits=10, decimal_places=2, default=1000,
    )
    employment_income_source_name = models.CharField(
        max_length=255, default="K Line Europe",
    )
    kyrgyzstan_goal_code = models.CharField(max_length=32, default="g1")
    independent_income_goal_code = models.CharField(max_length=32, default="g2")
    timezone = models.CharField(max_length=64, default="Africa/Cairo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "app settings"

    def __str__(self):
        return self.name

    @staticmethod
    def _decimal_env(name, default):
        raw_value = os.getenv(name)
        if raw_value is None or raw_value.strip() == "":
            return Decimal(str(default))
        try:
            return Decimal(raw_value.strip())
        except InvalidOperation as exc:
            raise ValueError(f"{name} must be a valid decimal value.") from exc

    @staticmethod
    def _string_env(name, default):
        raw_value = os.getenv(name)
        if raw_value is None:
            return default
        value = raw_value.strip()
        return value if value else default

    @classmethod
    def bootstrap_defaults(cls):
        """Bootstrap runtime defaults when no persisted settings record exists."""
        return {
            "name": cls._string_env("APP_SETTINGS_NAME", "Default Settings"),
            "eur_to_usd_rate": cls._decimal_env("CURRENCY_EUR_USD_RATE", "1.08"),
            "eur_to_egp_rate": cls._decimal_env("CURRENCY_EUR_EGP_RATE", "33.50"),
            "independent_income_target_eur": cls._decimal_env(
                "INDEPENDENT_INCOME_TARGET_EUR",
                "1000",
            ),
            "employment_income_source_name": cls._string_env(
                "EMPLOYMENT_INCOME_SOURCE_NAME",
                "K Line Europe",
            ),
            "kyrgyzstan_goal_code": cls._string_env("KYRGYZSTAN_GOAL_CODE", "g1"),
            "independent_income_goal_code": cls._string_env(
                "INDEPENDENT_INCOME_GOAL_CODE",
                "g2",
            ),
            "timezone": cls._string_env(
                "APP_SETTINGS_TIMEZONE",
                cls._string_env("TIME_ZONE", "Africa/Cairo"),
            ),
        }

    @classmethod
    def get_solo(cls):
        """Return the persisted settings row, bootstrapping it from env when absent."""
        settings_obj = cls.objects.order_by("created_at", "id").first()
        if settings_obj:
            return settings_obj
        return cls.objects.create(**cls.bootstrap_defaults())


class DailyCheckIn(BaseModel):
    """Tracks daily check-ins and preserves the raw input from all 7 questions.

    Raw fields are stored here exactly as submitted so the check-in can be
    replayed or audited later. Domain models (HealthLog, MoodLog, etc.) are
    populated by CheckInService from these values.
    """

    date = models.DateField(unique=True)

    # Raw inputs from the 7 check-in questions (PRD §6)
    sleep_hours = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True,
        help_text="Q1: How many hours did you sleep?",
    )
    sleep_quality = models.IntegerField(
        null=True, blank=True,
        help_text="Q2: Sleep quality 1-5.",
    )
    energy_level = models.IntegerField(
        null=True, blank=True,
        help_text="Q3: Energy level right now 1-5.",
    )
    exercise_done = models.BooleanField(
        null=True, blank=True,
        help_text="Q4: Did you exercise yesterday?",
    )
    exercise_type = models.CharField(
        max_length=255, blank=True,
        help_text="Q4: Exercise type if done.",
    )
    inbox_text = models.TextField(
        blank=True,
        help_text="Q6: Any new thought or idea to capture?",
    )
    blockers_text = models.TextField(
        blank=True,
        help_text="Q7: Anything blocking you today?",
    )

    # AI-generated output
    briefing_text = models.TextField(
        blank=True,
        help_text="AI-generated morning briefing from this check-in.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"Check-in {self.date}"
