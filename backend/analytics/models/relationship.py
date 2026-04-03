"""Relationship model — important people and follow-up tracking.

Simple CRUD with no cross-module triggers.
"""
from django.db import models

from config.base_model import BaseModel


class Relationship(BaseModel):
    """An important person in Mohamed's network.

    Tracks last contact date and follow-up notes for relationship maintenance.
    """

    name = models.CharField(max_length=255)
    relationship_type = models.CharField(
        max_length=255, help_text="E.g. 'mentor', 'client', 'friend', 'colleague'.",
    )
    last_contact = models.DateField(
        null=True, blank=True, help_text="Date of last interaction.",
    )
    follow_up_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.relationship_type})"
