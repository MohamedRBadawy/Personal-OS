"""Models for the Schedule domain.

Contains ScheduleTemplate (reusable day plans), ScheduleBlock (time slots
within a template), and ScheduleLog (daily completion tracking per block).

Cross-module: blocks can link to Goal tasks; AI fills adjustable slots
using available tasks from the Goals module.
"""
from django.db import models

from config.base_model import BaseModel


class ScheduleTemplate(BaseModel):
    """A reusable daily schedule template.

    Only one template is active at a time. Contains ScheduleBlocks.
    """

    name = models.CharField(max_length=255, default="My Schedule")
    is_active = models.BooleanField(
        default=True, help_text="Only one template should be active.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        active = " (Active)" if self.is_active else ""
        return f"{self.name}{active}"


class ScheduleBlock(BaseModel):
    """A single time block within a ScheduleTemplate.

    Can be fixed (user-controlled) or adjustable (AI can fill with tasks).
    """

    class BlockType(models.TextChoices):
        """Category of activity for this time block."""
        SPIRITUAL = "spiritual", "Spiritual"
        HEALTH = "health", "Health"
        WORK = "work", "Work"
        MARKETING = "marketing", "Marketing"
        LEARNING = "learning", "Learning"
        PERSONAL = "personal", "Personal"
        FAMILY = "family", "Family"

    template = models.ForeignKey(
        ScheduleTemplate, on_delete=models.CASCADE, related_name="blocks",
    )
    time = models.TimeField(help_text="Start time of this block (e.g. 05:00).")
    label = models.CharField(max_length=255, help_text="Display label for this block.")
    type = models.CharField(max_length=20, choices=BlockType.choices)
    is_fixed = models.BooleanField(
        default=False, help_text="Fixed blocks cannot be auto-replaced by AI.",
    )
    duration_mins = models.PositiveIntegerField(help_text="Duration in minutes.")
    is_adjustable = models.BooleanField(
        default=True, help_text="AI can fill this slot with a task.",
    )
    sort_order = models.PositiveIntegerField(
        default=0, help_text="Order within the template.",
    )

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.time} — {self.label} ({self.duration_mins}min)"


class ScheduleLog(BaseModel):
    """Daily log entry for a single schedule block — tracks completion.

    Links to the block and optionally to a specific task node from Goals.
    """

    class LogStatus(models.TextChoices):
        """Completion status for a schedule block on a given day."""
        DONE = "done", "Done"
        LATE = "late", "Late"
        PARTIAL = "partial", "Partial"
        SKIPPED = "skipped", "Skipped"
        NOT_LOGGED = "not_logged", "Not logged"

    date = models.DateField()
    block = models.ForeignKey(
        ScheduleBlock, on_delete=models.CASCADE, related_name="logs",
    )
    task_node = models.ForeignKey(
        "goals.Node", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="schedule_logs",
        help_text="Task node assigned to this slot (if any).",
    )
    status = models.CharField(
        max_length=20, choices=LogStatus.choices, default=LogStatus.NOT_LOGGED,
    )
    actual_time = models.TimeField(
        null=True, blank=True, help_text="When this block was actually started.",
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.date} — {self.block.label} — {self.get_status_display()}"


class RoutineBlock(models.Model):
    """Editable routine block — the source of truth for the daily schedule.

    Replaces the hardcoded SCHEDULE array in the frontend. Each block maps to
    RoutineLog entries via `time` (stored as "HH:MM" string match).
    """

    class BlockType(models.TextChoices):
        SPIRITUAL = "spiritual", "Spiritual"
        HEALTH = "health", "Health"
        WORK = "work", "Work"
        PERSONAL = "personal", "Personal"
        FAMILY = "family", "Family"

    time = models.TimeField(help_text="Block start time, e.g. 05:00.")
    label = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=BlockType.choices, default=BlockType.PERSONAL)
    duration_minutes = models.PositiveIntegerField(default=30)
    is_fixed = models.BooleanField(
        default=True, help_text="Fixed = user committed; flex = adjustable."
    )
    order = models.PositiveIntegerField(default=0, help_text="Sort order in the schedule.")
    active = models.BooleanField(default=True)
    linked_node = models.ForeignKey(
        "goals.Node",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_routine_blocks",
        help_text="Goal or project this block serves.",
    )

    # ── Importance ───────────────────────────────────────────────────────────
    importance = models.CharField(
        max_length=10, default='should',
        help_text="must | should | nice — weights the completion score",
    )

    # ── Detail fields ─────────────────────────────────────────────────────────
    # Universal
    description = models.TextField(
        blank=True, default='', help_text="Why this block exists; personal notes.",
    )
    days_of_week = models.CharField(
        max_length=7, blank=True, default='',
        help_text="Empty = every day. Digits 1–7 (1=Mon…7=Sun). E.g. '135' = Mon/Wed/Fri.",
    )
    # Spiritual-specific
    location = models.CharField(
        max_length=20, blank=True, default='',
        help_text="mosque | home | online",
    )
    target = models.CharField(
        max_length=200, blank=True, default='',
        help_text="e.g. '1 juz Quran', 'adhkar'",
    )
    # Health-specific
    exercise_type = models.CharField(
        max_length=20, blank=True, default='',
        help_text="cardio | strength | yoga | hiit | swimming | cycling",
    )
    intensity = models.CharField(
        max_length=10, blank=True, default='',
        help_text="low | medium | high",
    )
    # Work-specific
    focus_area = models.CharField(
        max_length=20, blank=True, default='',
        help_text="deep_work | email | calls | admin | outreach",
    )
    deliverable = models.CharField(
        max_length=200, blank=True, default='',
        help_text="Expected output for this work block.",
    )

    class Meta:
        ordering = ["order", "time"]

    def __str__(self):
        t = self.time.strftime("%H:%M")
        return f"{t} — {self.label}"

    def time_str(self) -> str:
        return self.time.strftime("%H:%M")


class RoutineLog(models.Model):
    """Per-day per-block log for the hardcoded daily routine."""

    class LogStatus(models.TextChoices):
        DONE = "done", "Done"
        PARTIAL = "partial", "Partial"
        LATE = "late", "Late"
        SKIPPED = "skipped", "Skipped"

    date = models.DateField()
    block_time = models.TimeField(help_text="Start time of the routine block (e.g. 05:00).")
    status = models.CharField(max_length=10, choices=LogStatus.choices)
    actual_time = models.TimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("date", "block_time")]
        ordering = ["date", "block_time"]

    def __str__(self):
        return f"{self.date} {self.block_time} — {self.get_status_display()}"


class ScheduledEntry(models.Model):
    """A one-off task scheduled for a specific date and time slot.

    Created when the user drags a goal task onto a free slot in the
    Day Schedule calendar. Separate from recurring RoutineBlocks.
    """

    date = models.DateField(db_index=True, help_text="The calendar date for this entry.")
    time = models.TimeField(help_text="Start time of the scheduled slot.")
    duration_minutes = models.PositiveIntegerField(
        default=60,
        help_text="How long this task is expected to take.",
    )
    node = models.ForeignKey(
        "goals.Node",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="scheduled_entries",
        help_text="Goal task being scheduled (optional — can be a free-label entry).",
    )
    label = models.CharField(
        max_length=255, blank=True,
        help_text="Display label — falls back to node.title when node is set.",
    )
    done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "time"]

    def __str__(self) -> str:
        t = self.time.strftime("%H:%M")
        title = self.label or (self.node.title if self.node_id else "Unnamed")
        return f"{self.date} {t} – {title}"
