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
        DEFERRED = "deferred", "Deferred"

    class Effort(models.TextChoices):
        """Effort estimate for a node."""
        MIN_15 = "15min", "15 min"
        MIN_30 = "30min", "30 min"
        H_1 = "1h", "1 hour"
        H_2 = "2h", "2 hours"
        H_4 = "4h", "4 hours"
        DAY_1 = "1day", "1 day"
        DAY_2 = "2days", "2 days"
        WEEK_1 = "1week", "1 week"
        ONGOING = "ongoing", "Ongoing"

    class ManualPriority(models.TextChoices):
        """Manual priority override for actionable task work."""
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    class BusinessContext(models.TextChoices):
        """Which business context this node belongs to."""
        K_LINE       = "k_line",       "K Line Europe"
        FREELANCE    = "freelance",     "Freelance client"
        OWN_BUSINESS = "own_business",  "Own business"
        IDEA         = "idea",          "Business idea"

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
    # New structured fields for redesign
    priority = models.IntegerField(
        null=True, blank=True,
        help_text="Priority 1=Critical, 2=Important, 3=Normal, 4=Low.",
    )
    progress = models.IntegerField(default=0, help_text="Progress percentage 0–100.")
    tags = models.JSONField(default=list, blank=True, help_text="List of tag strings.")
    effort = models.CharField(
        max_length=10, choices=Effort.choices, blank=True,
        help_text="Effort estimate.",
    )
    start_date = models.DateField(null=True, blank=True)
    target_date = models.DateField(null=True, blank=True, help_text="Target completion date.")
    why = models.TextField(blank=True, help_text="The deeper motivation or reason for this goal.")
    checklist = models.JSONField(
        default=list, blank=True,
        help_text="Ordered list of {text, done} checklist items for lightweight sub-tracking.",
    )
    order = models.IntegerField(
        default=0,
        help_text="Manual sort order within the same parent group (lower = first).",
    )
    focus_date = models.DateField(
        null=True, blank=True,
        help_text="Date this node is scheduled for focused work. Set to today to surface it in Today's Focus.",
    )
    business_context = models.CharField(
        max_length=20,
        choices=BusinessContext.choices,
        blank=True,
        default="",
        help_text="Which business context this node belongs to.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["order", "-created_at"]
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



class Attachment(models.Model):
    """URL, file, or text snippet attached to a Node or a global library entry."""

    class AttachmentType(models.TextChoices):
        URL = "url", "URL"
        FILE = "file", "File"
        SNIPPET = "snippet", "Text snippet"

    node = models.ForeignKey(
        Node,
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name="attachments",
        help_text="Node this attachment belongs to. Null = library item.",
    )
    page_context = models.CharField(
        max_length=64, blank=True,
        help_text="Set to 'library' for global library items not tied to a node.",
    )
    type = models.CharField(
        max_length=10, choices=AttachmentType.choices, default=AttachmentType.URL
    )
    title = models.CharField(max_length=255)
    url = models.URLField(blank=True, max_length=2000)
    file = models.FileField(upload_to="attachments/", blank=True)
    content = models.TextField(blank=True, help_text="For snippet type: the pasted text.")
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_type_display()}: {self.title}"


class TimeLog(models.Model):
    """Records actual time spent on a node.

    Each row represents one work session. 'minutes' is the authoritative
    duration — set automatically from started_at/ended_at, or entered manually.
    """

    node = models.ForeignKey(
        Node,
        on_delete=models.CASCADE,
        related_name="timelogs",
        help_text="The node this session was logged against.",
    )
    started_at = models.DateTimeField(
        null=True, blank=True,
        help_text="When the session started (UTC). Null for manual entries.",
    )
    ended_at = models.DateTimeField(
        null=True, blank=True,
        help_text="When the session ended (UTC). Null while still running.",
    )
    minutes = models.PositiveIntegerField(
        default=0,
        help_text="Duration in minutes (computed from started/ended or entered manually).",
    )
    note = models.CharField(
        max_length=255, blank=True,
        help_text="Optional note about what was accomplished in this session.",
    )
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-logged_at"]

    def __str__(self):
        return f"{self.node.title} — {self.minutes}m @ {self.logged_at.date()}"

    def save(self, *args, **kwargs):
        # Auto-compute minutes from start/end timestamps when both are present
        if self.started_at and self.ended_at and not self.minutes:
            delta = self.ended_at - self.started_at
            self.minutes = max(0, int(delta.total_seconds() // 60))
        super().save(*args, **kwargs)


class LearningItem(models.Model):
    """A book, course, article, video, or podcast being tracked."""

    class ItemType(models.TextChoices):
        BOOK = "book", "Book"
        COURSE = "course", "Course"
        ARTICLE = "article", "Article"
        VIDEO = "video", "Video"
        PODCAST = "podcast", "Podcast"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        IN_PROGRESS = "in_progress", "In progress"
        DONE = "done", "Done"

    title = models.CharField(max_length=300)
    author = models.CharField(max_length=200, blank=True)
    type = models.CharField(max_length=20, choices=ItemType.choices, default=ItemType.BOOK)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    progress_pct = models.IntegerField(default=0, help_text="0–100 progress percentage.")
    linked_node = models.ForeignKey(
        Node, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="learning_items",
    )
    started = models.DateField(null=True, blank=True)
    finished = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "learning item"

    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"
