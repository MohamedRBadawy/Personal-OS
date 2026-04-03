"""SpiritualLog model — daily prayer, Quran, and dhikr tracking.

One entry per day. Tracks five daily prayers individually,
Quran pages read, and dhikr completion. prayers_count is a derived property.
"""
from django.db import models

from config.base_model import BaseModel


class SpiritualLog(BaseModel):
    """Daily spiritual practice log — one per day.

    Tracks individual prayer completion (fajr through isha),
    Quran reading, and dhikr. prayers_count is auto-derived.
    """

    date = models.DateField(unique=True, help_text="One spiritual log per day.")

    # Five daily prayers
    fajr = models.BooleanField(default=False)
    dhuhr = models.BooleanField(default=False)
    asr = models.BooleanField(default=False)
    maghrib = models.BooleanField(default=False)
    isha = models.BooleanField(default=False)

    # Quran and dhikr
    quran_pages = models.PositiveIntegerField(
        default=0, help_text="Pages of Quran read today.",
    )
    dhikr_done = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def prayers_count(self):
        """Count of completed prayers today (0-5)."""
        return sum([self.fajr, self.dhuhr, self.asr, self.maghrib, self.isha])

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"Spiritual {self.date}: {self.prayers_count}/5 prayers"
