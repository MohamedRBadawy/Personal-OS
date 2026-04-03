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
