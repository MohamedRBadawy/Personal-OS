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

    class ManualPriority(models.TextChoices):
        """Manual priority override for actionable task work."""
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

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
    due_date = models.DateField(
        null=True,
        blank=True,
        help_text="Optional due date for task and sub-task items.",
    )
    manual_priority = models.CharField(
        max_length=10,
        choices=ManualPriority.choices,
        null=True,
        blank=True,
        help_text="Optional manual priority for task and sub-task items.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "nodes"

    def __str__(self):
        label = self.code or self.get_type_display()
        return f"[{label}] {self.title}"


class GoalAttachmentProfile(BaseModel):
    """Structured support layers attached to a goal-like node."""

    node = models.OneToOneField(
        Node,
        on_delete=models.CASCADE,
        related_name="attachment_profile",
    )
    recommended_layers = models.JSONField(
        default=list,
        blank=True,
        help_text="Deterministic AI-suggested support layers for this node.",
    )
    habits = models.JSONField(
        default=list,
        blank=True,
        help_text="Supporting habits that reinforce this goal or project.",
    )
    marketing_actions = models.JSONField(
        default=list,
        blank=True,
        help_text="Marketing or visibility actions attached to this node.",
    )
    process_notes = models.TextField(
        blank=True,
        help_text="Repeatable process notes that make execution easier.",
    )
    tools = models.JSONField(
        default=list,
        blank=True,
        help_text="Tools or systems that support the work.",
    )
    learning_path = models.JSONField(
        default=list,
        blank=True,
        help_text="Learning resources or milestones needed for the goal.",
    )
    supporting_people = models.JSONField(
        default=list,
        blank=True,
        help_text="People, mentors, or collaborators connected to this work.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["node__title"]
        verbose_name = "goal attachment profile"
        verbose_name_plural = "goal attachment profiles"

    def __str__(self):
        return f"Attachments for {self.node.title}"
