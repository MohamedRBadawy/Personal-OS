"""Models for the Contacts domain.

Contact tracks people in Mohamed's life — clients, mentors, friends, family —
with last-contact date and next follow-up reminder.
"""
import datetime

from django.db import models


class Contact(models.Model):
    """A person worth keeping a relationship with."""

    class Relation(models.TextChoices):
        CLIENT = "client", "Client"
        PROSPECT = "prospect", "Prospect"
        MENTOR = "mentor", "Mentor"
        FRIEND = "friend", "Friend"
        FAMILY = "family", "Family"
        COLLEAGUE = "colleague", "Colleague"
        OTHER = "other", "Other"

    class CRMStage(models.TextChoices):
        LEAD          = "lead",          "Lead"
        PROSPECT      = "prospect",      "Prospect"
        ACTIVE_CLIENT = "active_client", "Active Client"
        PAST_CLIENT   = "past_client",   "Past Client"
        PARTNER       = "partner",       "Partner"
        EMPLOYER      = "employer",      "Employer"

    name = models.CharField(max_length=200)
    relation = models.CharField(
        max_length=20, choices=Relation.choices, default=Relation.OTHER,
    )
    company = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    last_contact = models.DateField(
        null=True, blank=True,
        help_text="Date of most recent interaction.",
    )
    next_followup = models.DateField(
        null=True, blank=True,
        help_text="Scheduled next follow-up date.",
    )
    notes = models.TextField(blank=True)
    linked_node = models.ForeignKey(
        "goals.Node",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="contacts",
        help_text="Optional link to a goal or project node.",
    )
    crm_stage = models.CharField(
        max_length=20,
        choices=CRMStage.choices,
        blank=True,
        default="",
        help_text="Business CRM stage for this contact.",
    )
    source = models.CharField(
        max_length=100, blank=True,
        help_text="How you met: Upwork, Referral, LinkedIn, etc.",
    )
    linked_opportunity = models.ForeignKey(
        "pipeline.Opportunity",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="crm_contacts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "contact"

    def __str__(self):
        return f"{self.name} ({self.get_relation_display()})"

    @property
    def followup_overdue(self) -> bool:
        if not self.next_followup:
            return False
        return self.next_followup <= datetime.date.today()

    @property
    def days_since_contact(self) -> int | None:
        if not self.last_contact:
            return None
        return (datetime.date.today() - self.last_contact).days


class ContactInteraction(models.Model):
    """A logged interaction with a contact — email, call, meeting, message, note."""

    class InteractionType(models.TextChoices):
        EMAIL   = "email",   "Email"
        CALL    = "call",    "Call"
        MEETING = "meeting", "Meeting"
        MESSAGE = "message", "Message"
        NOTE    = "note",    "Note"

    contact    = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="interactions")
    date       = models.DateField()
    type       = models.CharField(max_length=20, choices=InteractionType.choices)
    summary    = models.TextField()
    outcome    = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.get_type_display()} with {self.contact.name} on {self.date}"
