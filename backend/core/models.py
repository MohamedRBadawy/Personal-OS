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
    bad_day_mode = models.BooleanField(
        default=False,
        help_text="When on: minimal routine, no nudges, show only 3 non-negotiables.",
    )
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
            "eur_to_egp_rate": cls._decimal_env("CURRENCY_EUR_EGP_RATE", "60.00"),
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


class ReadinessSnapshot(BaseModel):
    """Daily Kyrgyzstan readiness score — one record per day, cached."""

    date            = models.DateField(unique=True)
    total_score     = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Component scores
    income_score    = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Max 40 — independent income vs €1,000 target")
    debt_score      = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Max 15 — total debt cleared vs 33,150 EGP baseline")
    pipeline_score  = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Max 10 — active outreach opportunities")
    routine_score   = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Max 10 — routine streak consistency")
    spiritual_score = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Max 10 — prayer completion rate (30 days)")
    savings_score   = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Max 10 — emergency buffer vs 3 months expenses")
    family_score    = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Max 5 — family goals progress")

    # Raw values for tooltip / sparkline
    snapshot_data   = models.JSONField(default=dict, blank=True,
                                       help_text="Raw source values used in computation.")
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"Readiness {self.date}: {self.total_score}"


class DailyCheckIn(BaseModel):
    """Tracks daily check-ins and preserves the raw input from all 7 questions.

    Raw fields are stored here exactly as submitted so the check-in can be
    replayed or audited later. Domain models (HealthLog, MoodLog, etc.) are
    populated by CheckInService from these values.

    One record per day. morning_completed_at / evening_completed_at track
    whether each session has been submitted.
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

    # Evening check-in fields
    mood_score = models.IntegerField(
        null=True, blank=True,
        help_text="Overall mood today 1-10 (evening).",
    )
    gratitude_note = models.TextField(
        blank=True,
        help_text="Gratitude note from evening check-in.",
    )
    evening_wins = models.TextField(
        blank=True,
        help_text="3 wins from the day (evening check-in).",
    )
    tomorrow_focus = models.TextField(
        blank=True,
        help_text="Top priority / focus for tomorrow.",
    )

    # Session completion timestamps
    morning_completed_at = models.DateTimeField(
        null=True, blank=True,
        help_text="When the morning check-in session was submitted.",
    )
    evening_completed_at = models.DateTimeField(
        null=True, blank=True,
        help_text="When the evening check-in session was submitted.",
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


class Alert(BaseModel):
    """A smart system alert surfaced to Mohamed in the app and optionally via Telegram.

    Alerts are generated automatically by AlertService (run hourly via cron).
    They resolve automatically when the underlying condition clears.
    """

    TYPES = [
        ("follow_up_due",  "Pipeline follow-up overdue"),
        ("node_overdue",   "Goal/task past due date"),
        ("checkin_missed", "Morning check-in not done"),
        ("readiness_drop", "Kyrgyzstan score dropped"),
        ("streak_broken",  "Routine streak broken"),
        ("pipeline_empty", "No active pipeline opportunities"),
        ("ai_suggestion",  "New AI recommendation"),
        ("debt_milestone", "Debt payoff milestone"),
    ]
    PRIORITIES = [
        ("critical", "Critical"),
        ("warning",  "Warning"),
        ("info",     "Info"),
    ]

    alert_type    = models.CharField(max_length=50, choices=TYPES)
    title         = models.CharField(max_length=200)
    body          = models.TextField()
    priority      = models.CharField(max_length=20, choices=PRIORITIES, default="info")
    link_url      = models.CharField(max_length=200, blank=True)  # e.g. '/pipeline'
    read          = models.BooleanField(default=False)
    sent_telegram = models.BooleanField(default=False)
    dismissed_at  = models.DateTimeField(null=True, blank=True)
    resolved_at   = models.DateTimeField(null=True, blank=True)  # auto-cleared when condition clears
    date          = models.DateField(auto_now_add=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title}"
