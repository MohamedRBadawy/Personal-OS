# [AR] التزامات المراجعة الأسبوعية — تحول التأمل إلى وعود قابلة للمحاسبة
# [EN] Weekly review commitments — turns reflection into accountable follow-through
from django.db import models

from config.base_model import BaseModel


class ReviewCommitment(BaseModel):
    """A stop/change/start commitment captured during a weekly review."""

    class ActionType(models.TextChoices):
        STOP = "stop", "Stop"
        CHANGE = "change", "Change"
        START = "start", "Start"

    review = models.ForeignKey(
        "analytics.WeeklyReview",
        on_delete=models.CASCADE,
        related_name="commitments",
    )
    node_update = models.ForeignKey(
        "goals.Node",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="review_commitments",
    )
    checked_in_review = models.ForeignKey(
        "analytics.WeeklyReview",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checked_commitments",
    )
    action_type = models.CharField(max_length=10, choices=ActionType.choices)
    description = models.TextField()
    was_kept = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.get_action_type_display()}: {self.description[:80]}"
