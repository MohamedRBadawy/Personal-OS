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
