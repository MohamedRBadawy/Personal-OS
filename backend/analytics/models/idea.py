# [AR] نموذج الفكرة — أفكار خام يمكن تحويلها إلى أهداف
# [EN] Idea model — raw captures that can be converted to goals
from django.db import models

from config.base_model import BaseModel


class Idea(BaseModel):
    """A raw thought or concept that may become a project or goal."""

    class Status(models.TextChoices):
        """Progression status of the idea."""
        RAW = "raw", "Raw"
        EXPLORING = "exploring", "Exploring"
        VALIDATED = "validated", "Validated"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=255, blank=True)
    context = models.TextField(
        blank=True, help_text="Background, inspiration, or initial thinking.",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RAW,
    )
    linked_goal = models.ForeignKey(
        "goals.Node", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ideas", help_text="Goal this idea connects to.",
    )
    # [AR] تلميح النطاق — يُقترح تلقائياً بناءً على كلمات العنوان
    # [EN] Domain hint — auto-suggested or user-overridden domain routing
    domain_hint = models.CharField(
        max_length=32, null=True, blank=True,
        help_text="Hub domain this idea belongs to (auto-suggested or user-set)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
