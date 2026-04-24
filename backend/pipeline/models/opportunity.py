# [AR] نماذج الفرص وعروض الخدمات والعملاء — قلب منظومة خط الأنابيب
# [EN] Opportunity, ServiceOffering, and Client models — core of the pipeline domain

from django.db import models

from config.base_model import BaseModel


class ServiceOffering(BaseModel):
    """A named service that Mohamed offers to clients.

    The foundation of the freelancing system — every opportunity, campaign,
    and finance entry can trace back to a specific offering with defined
    pricing, deliverables, and target client.
    """

    class PricingModel(models.TextChoices):
        FIXED     = "fixed",     "Fixed price"
        HOURLY    = "hourly",    "Hourly rate"
        RETAINER  = "retainer",  "Monthly retainer"
        DISCOVERY = "discovery", "Discovery call → custom quote"

    class Status(models.TextChoices):
        DRAFT    = "draft",    "Draft"
        ACTIVE   = "active",   "Active"
        PAUSED   = "paused",   "Paused"
        ARCHIVED = "archived", "Archived"

    name           = models.CharField(max_length=200)
    tagline        = models.CharField(max_length=300, blank=True,
                                      help_text="One-line sell: what it does and for whom.")
    description    = models.TextField(blank=True)
    target_client  = models.CharField(max_length=200, blank=True,
                                      help_text="Who is this for? e.g. 'Small logistics companies'")
    pricing_model  = models.CharField(max_length=20, choices=PricingModel.choices,
                                      default=PricingModel.FIXED)
    price          = models.DecimalField(max_digits=10, decimal_places=2,
                                         null=True, blank=True)
    currency       = models.CharField(max_length=5, default="EUR")
    delivery_days  = models.PositiveIntegerField(null=True, blank=True,
                                                 help_text="Typical engagement length in days.")
    deliverables   = models.JSONField(default=list, blank=True,
                                      help_text="List of strings — what the client receives.")
    status         = models.CharField(max_length=20, choices=Status.choices,
                                      default=Status.DRAFT)
    linked_goal    = models.ForeignKey(
        "goals.Node", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="service_offerings",
    )
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "name"]

    def __str__(self):
        return self.name


class Client(BaseModel):
    """A real client created when an opportunity is won."""

    name = models.CharField(max_length=255)
    source_platform = models.CharField(max_length=64, blank=True)
    opportunity = models.OneToOneField(
        "pipeline.Opportunity", on_delete=models.SET_NULL, null=True, blank=True,
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
    service_offering = models.ForeignKey(
        ServiceOffering, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="opportunities",
        help_text="Which service this opportunity is for.",
    )
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

    # [AR] حقول تتبع التواصل — تُحدَّث في كل خطوة تواصل
    # [EN] Outreach tracking fields — updated on each outreach step
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

    # [AR] حقول قيمة الصفقة — تغذّي شريط النجم الشمالي بالتوقعات المرجَّحة
    # [EN] Deal value fields — feed the north star bar with weighted pipeline projection
    monthly_value_eur   = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Expected monthly value in EUR if recurring, or total if one-time.",
    )
    is_recurring        = models.BooleanField(
        default=True,
        help_text="True = counts toward monthly recurring income metric when won.",
    )
    expected_close_date = models.DateField(
        null=True, blank=True,
        help_text="Target date to close this opportunity.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_found"]
        verbose_name_plural = "opportunities"

    def __str__(self):
        return f"{self.name} ({self.get_platform_display()}) — {self.get_status_display()}"
