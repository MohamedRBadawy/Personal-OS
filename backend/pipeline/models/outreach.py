# [AR] نموذج خطوات التواصل — يسجّل كل خطوة في مسار التواصل مع العميل المحتمل
# [EN] OutreachStep model — logs each step in the outreach sequence for an opportunity

from datetime import date

from django.conf import settings
from django.db import models

from pipeline.models.opportunity import Opportunity


class OutreachStep(models.Model):
    """A single logged step in the outreach sequence for one opportunity.

    Connects to: Opportunity (parent), User (owner).
    The full step timeline replaces scalar outreach_count tracking for
    detailed history and overdue detection.
    """

    class StepType(models.TextChoices):
        # [AR] أنواع خطوات التواصل — من الرسالة الأولى حتى إغلاق الصفقة
        # [EN] Step type enum — covers the full B2B service sales sequence
        FIRST_MESSAGE   = "first_message",   "First Message Sent"
        REPLY_RECEIVED  = "reply_received",  "Reply Received"
        MEETING_BOOKED  = "meeting_booked",  "Meeting Booked"
        PROPOSAL_SENT   = "proposal_sent",   "Proposal Sent"
        WON             = "won",             "Won"
        LOST            = "lost",            "Lost"

    opportunity     = models.ForeignKey(
        Opportunity, on_delete=models.CASCADE, related_name="outreach_steps",
    )
    # [AR] المستخدم اختياري حتى تُفعَّل المصادقة متعددة المستخدمين
    # [EN] User nullable until multi-user auth is activated (constitution v2.0.1)
    user            = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="outreach_steps",
    )
    step_type       = models.CharField(max_length=20, choices=StepType.choices)
    date            = models.DateField(default=date.today)
    notes           = models.TextField(blank=True)
    draft_message   = models.TextField(blank=True,
                                       help_text="Captured from AI draft if applicable.")
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.get_step_type_display()} — {self.opportunity.name} ({self.date})"
