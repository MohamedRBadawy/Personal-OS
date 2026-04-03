"""Models for the Goals domain.

Contains the Node model — the universal building block for goals, projects,
tasks, sub-tasks, ideas, and burdens. Supports infinite nesting via a
self-referential parent FK and cross-node dependencies via M2M.
"""
from django.db import models

from config.base_model import BaseModel


class Node(BaseModel):
    """A single node in the life plan hierarchy.

    Can be a goal, project, task, sub_task, idea, or burden.
    Supports self-referential parent (infinite nesting) and
    many-to-many dependencies on other nodes.
    """

    class NodeType(models.TextChoices):
        """Types of nodes in the hierarchy."""
        GOAL = "goal", "Goal"
        PROJECT = "project", "Project"
        TASK = "task", "Task"
        SUB_TASK = "sub_task", "Sub-task"
        IDEA = "idea", "Idea"
        BURDEN = "burden", "Burden"

    class Category(models.TextChoices):
        """Life domain categories for organizing nodes."""
        CAREER = "Career", "Career"
        FINANCE = "Finance", "Finance"
        HEALTH = "Health", "Health"
        SPIRITUAL = "Spiritual", "Spiritual"
        FAMILY = "Family", "Family"
        LEARNING = "Learning", "Learning"
        PERSONAL = "Personal", "Personal"
        LIFE = "Life", "Life"

    class Status(models.TextChoices):
        """Status of a node — drives dependency logic."""
        ACTIVE = "active", "Active"
        AVAILABLE = "available", "Available"
        BLOCKED = "blocked", "Blocked"
        DONE = "done", "Done"

    code = models.CharField(
        max_length=32,
        unique=True,
        null=True,
        blank=True,
        help_text="Stable identifier for seeded nodes such as g1 and g2.",
    )
    title = models.CharField(max_length=255, help_text="Name of this node.")
    type = models.CharField(max_length=20, choices=NodeType.choices)
    category = models.CharField(max_length=20, choices=Category.choices, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE,
    )
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="children", help_text="Parent node (enables nesting).",
    )
    deps = models.ManyToManyField(
        "self", symmetrical=False, blank=True,
        related_name="dependents", help_text="Nodes this node depends on.",
    )
    notes = models.TextField(blank=True, help_text="Free-text notes.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "nodes"

    def __str__(self):
        label = self.code or self.get_type_display()
        return f"[{label}] {self.title}"
