"""Models for the Pipeline domain."""
from django.db import models

from config.base_model import BaseModel


class MarketingChannel(BaseModel):
    """A platform or channel where Mohamed maintains a marketing presence."""

    class Platform(models.TextChoices):
        LINKEDIN   = "linkedin",   "LinkedIn"
        UPWORK     = "upwork",     "Upwork"
        FREELANCER = "freelancer", "Freelancer"
        EMAIL      = "email",      "Email Outreach"
        REFERRAL   = "referral",   "Referral Network"
        OTHER      = "other",      "Other"

    class Status(models.TextChoices):
        ACTIVE      = "active",      "Active"
        NEEDS_SETUP = "needs_setup", "Needs Setup"
        INACTIVE    = "inactive",    "Inactive"

    platform         = models.CharField(max_length=30, choices=Platform.choices)
    label            = models.CharField(max_length=100)
    profile_url      = models.URLField(blank=True)
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.NEEDS_SETUP)
    target_audience  = models.TextField(blank=True)
    notes            = models.TextField(blank=True)
    connections      = models.IntegerField(null=True, blank=True, help_text="Followers or connections count.")
    last_action_date = models.DateField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["platform"]

    def __str__(self):
        return f"{self.label} ({self.get_platform_display()})"


class MarketingCampaign(BaseModel):
    """A structured marketing initiative targeting specific platforms with a named offer."""

    class Status(models.TextChoices):
        PLANNED   = "planned",   "Planned"
        ACTIVE    = "active",    "Active"
        PAUSED    = "paused",    "Paused"
        COMPLETED = "completed", "Completed"

    name                  = models.CharField(max_length=255)
    goal_node             = models.ForeignKey(
        "goals.Node", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="marketing_campaigns",
    )
    channels              = models.ManyToManyField(
        MarketingChannel, blank=True, related_name="campaigns",
    )
    offer                 = models.TextField(help_text="What is being promoted.")
    target_audience       = models.TextField(blank=True)
    message_angle         = models.TextField(blank=True, help_text="The hook or angle.")
    status                = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    start_date            = models.DateField()
    end_date              = models.DateField(null=True, blank=True)
    target_outreach_count = models.IntegerField(default=0)
    notes                 = models.TextField(blank=True)
    created_at            = models.DateTimeField(auto_now_add=True)
    updated_at            = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


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
        NEW           = "new",           "New"
        REVIEWING     = "reviewing",     "Reviewing"
        APPLIED       = "applied",       "Applied"
        INTERVIEW     = "interview",     "Interview"
        PROPOSAL_SENT = "proposal_sent", "Proposal Sent"
        WON           = "won",           "Won"
        LOST          = "lost",          "Lost"
        REJECTED      = "rejected",      "Rejected"

    name = models.CharField(max_length=255)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    description = models.TextField(blank=True)
    budget = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW,
    )
    job_url = models.URLField(blank=True, help_text="Link to the original job listing.")
    client_name = models.CharField(max_length=255, blank=True)
    linked_contact = models.ForeignKey(
        "contacts.Contact",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="opportunities",
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

    # Outreach tracking fields
    last_outreach_at    = models.DateTimeField(null=True, blank=True,
                                               help_text="When the last message was sent.")
    outreach_count      = models.IntegerField(default=0,
                                             help_text="Total number of outreach messages sent.")
    next_followup_date  = models.DateField(null=True, blank=True,
                                           help_text="Date when a follow-up should be sent.")
    prospect_context    = models.TextField(blank=True,
                                           help_text="Notes about this prospect for AI drafting.")
    ai_draft            = models.TextField(blank=True,
                                           help_text="Cached AI-generated outreach message.")

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

    class ActionType(models.TextChoices):
        POST               = "post",               "Published Post"
        MESSAGE            = "message",            "Direct Message"
        EMAIL              = "email",              "Email"
        COMMENT            = "comment",            "Comment / Engagement"
        PROPOSAL           = "proposal",           "Proposal Submitted"
        CONNECTION_REQUEST = "connection_request", "Connection Request"
        CALL               = "call",               "Call"
        OTHER              = "other",              "Other"

    action = models.CharField(max_length=255, help_text="What was done.")
    platform = models.CharField(
        max_length=255, help_text="Where it was done (LinkedIn, Upwork, email, etc.).",
    )
    goal = models.ForeignKey(
        "goals.Node", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="marketing_actions",
        help_text="Which goal this marketing action serves.",
    )
    campaign = models.ForeignKey(
        MarketingCampaign, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="actions",
    )
    channel = models.ForeignKey(
        MarketingChannel, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="actions",
    )
    contact = models.ForeignKey(
        "contacts.Contact", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="marketing_actions",
    )
    action_type = models.CharField(
        max_length=30, choices=ActionType.choices, blank=True, default="",
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
