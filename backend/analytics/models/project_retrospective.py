"""Stored retrospective records for projects and opportunities."""
from django.db import models

from config.base_model import BaseModel


class ProjectRetrospective(BaseModel):
    """A reflection captured when work closes out."""

    class SourceType(models.TextChoices):
        PROJECT = "project", "Project"
        OPPORTUNITY = "opportunity", "Opportunity"

    title = models.CharField(max_length=255)
    source_type = models.CharField(max_length=20, choices=SourceType.choices)
    goal_node = models.OneToOneField(
        "goals.Node",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="project_retrospective",
    )
    opportunity = models.OneToOneField(
        "pipeline.Opportunity",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="project_retrospective",
    )
    status = models.CharField(max_length=32, blank=True)
    summary = models.TextField(blank=True)
    what_worked = models.TextField(blank=True)
    what_didnt = models.TextField(blank=True)
    next_time = models.TextField(blank=True)
    closed_at = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-closed_at", "-created_at"]

    def __str__(self):
        return f"{self.title} retrospective"
