"""Models for the Journal domain.

One JournalEntry per day — captures gratitude, wins, mood reflection,
and tomorrow's focus in a simple structured format.
"""
from django.db import models


class JournalEntry(models.Model):
    """A single day's journal entry. Unique per date."""

    date = models.DateField(unique=True, help_text="The date this entry covers (YYYY-MM-DD).")
    mood_note = models.TextField(
        blank=True,
        help_text="How am I feeling today? (free-form reflection)",
    )
    gratitude = models.TextField(
        blank=True,
        help_text="What am I grateful for today? (1–3 things)",
    )
    wins = models.TextField(
        blank=True,
        help_text="What went well or what did I accomplish today?",
    )
    tomorrow_focus = models.TextField(
        blank=True,
        help_text="What is the single most important thing for tomorrow?",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        verbose_name = "journal entry"
        verbose_name_plural = "journal entries"

    def __str__(self):
        return f"Journal — {self.date}"
