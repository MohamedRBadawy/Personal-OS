"""Models for the Pipeline domain."""
from django.db import models

from config.base_model import BaseModel


class Client(BaseModel):
    """A real client created when an opportunity is won."""

    name = models.CharField(max_length=255)
    source_platform = models.CharField(max_length=64, blank=True)
    opportunity = models.OneToOneField(
        "Opportunity", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="client",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Opportunity(BaseModel):
    """A freelance opportunity from any platform.

    Carries AI fit score, proposal draft, and full lifecycle tracking
    from discovery through to outcome.
    """

    class Platform(models.TextChoices):
        """Source platform where the opportunity was found."""
        UPWORK = "Upwork", "Upwork"
        FREELANCER = "Freelancer", "Freelancer"
        REFERRAL = "Referral", "Referral"
        DIRECT = "Direct", "Direct"
        OTHER = "Other", "Other"

    class Status(models.TextChoices):
        """Lifecycle status of the opportunity."""
        NEW = "new", "New"
        REVIEWING = "reviewing", "Reviewing"
        APPLIED = "applied", "Applied"
        WON = "won", "Won"
        LOST = "lost", "Lost"
        REJECTED = "rejected", "Rejected"

    name = models.CharField(max_length=255)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    description = models.TextField(blank=True)
    budget = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW,
    )
    fit_score = models.IntegerField(
        null=True, blank=True, help_text="AI-generated fit score 0-100.",
    )
    fit_reasoning = models.TextField(
        blank=True, help_text="AI explanation for the fit score.",
    )
    date_found = models.DateField(help_text="When this opportunity was discovered.")
    date_applied = models.DateField(null=True, blank=True)
    date_closed = models.DateField(null=True, blank=True)
    proposal_draft = models.TextField(
        blank=True, help_text="AI-drafted proposal text.",
    )
    outcome_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_found"]
        verbose_name_plural = "opportunities"

    def __str__(self):
        return f"{self.name} ({self.get_platform_display()}) — {self.get_status_display()}"


class MarketingAction(BaseModel):
    """A marketing or outreach action tied to a goal.

    Tracks what was done, where, and the result. Supports follow-up dates
    that appear as tasks in the Today view when due.
    """

    action = models.CharField(max_length=255, help_text="What was done.")
    platform = models.CharField(
        max_length=255, help_text="Where it was done (LinkedIn, Upwork, email, etc.).",
    )
    goal = models.ForeignKey(
        "goals.Node", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="marketing_actions",
        help_text="Which goal this marketing action serves.",
    )
    result = models.TextField(blank=True, help_text="Outcome or response received.")
    follow_up_date = models.DateField(
        null=True, blank=True, help_text="When to follow up.",
    )
    follow_up_done = models.BooleanField(default=False)
    date = models.DateField(help_text="When this action was taken.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.action} on {self.platform} ({self.date})"
