# [AR] نماذج الشراكات الرأسمالية — تتبع حصص الملكية والإجراءات لكل شراكة
# [EN] Equity partnership models — track ownership stakes and actions per partnership

from django.conf import settings
from django.db import models


class EquityPartnership(models.Model):
    """An equity stake in a partner's business.

    Connects to: User (owner). Each partnership has a status, equity percentage,
    agreed terms, and a chain of PartnershipActions.
    Equity partnerships do NOT contribute to monthly income until
    an actual distribution is logged via FinanceEntry.
    """

    class Status(models.TextChoices):
        # [AR] حالات الشراكة — من التفاوض حتى الخروج
        # [EN] Partnership status lifecycle
        NEGOTIATING = "negotiating", "Negotiating"
        ACTIVE      = "active",      "Active"
        ON_HOLD     = "on_hold",     "On Hold"
        EXITED      = "exited",      "Exited"

    # [AR] المستخدم اختياري حتى تُفعَّل المصادقة متعددة المستخدمين
    # [EN] User nullable until multi-user auth is activated (constitution v2.0.1)
    user            = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="equity_partnerships",
    )
    partner_name    = models.CharField(max_length=200)
    business_name   = models.CharField(max_length=200)
    business_type   = models.CharField(max_length=200, blank=True,
                                       help_text="e.g. 'Perfumes retail'")
    equity_pct      = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Equity percentage held, e.g. 20.00 for 20%.",
    )
    status          = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEGOTIATING,
    )
    terms_notes     = models.TextField(blank=True,
                                       help_text="Agreed terms in plain text.")
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business_name} ({self.equity_pct}% — {self.get_status_display()})"


class PartnershipAction(models.Model):
    """A discrete action within an equity partnership.

    Connects to: EquityPartnership (parent), User (owner).
    Only one action per partnership should have is_current_next_action=True.
    Completing an action clears that flag; a new next action can then be set.
    """

    partnership             = models.ForeignKey(
        EquityPartnership, on_delete=models.CASCADE, related_name="actions",
    )
    user                    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="partnership_actions",
    )
    description             = models.CharField(max_length=500)
    completed_at            = models.DateTimeField(null=True, blank=True)
    is_current_next_action  = models.BooleanField(default=False)
    created_at              = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "done" if self.completed_at else "pending"
        return f"{self.description[:60]} ({status})"
