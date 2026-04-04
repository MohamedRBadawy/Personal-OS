"""Business rules and read models for dependency-aware nodes."""
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from goals.models import GoalAttachmentProfile, Node


class NodeStatusService:
    """Encapsulates hierarchy validation and status recalculation."""

    parent_ready_statuses = {
        Node.Status.ACTIVE,
        Node.Status.AVAILABLE,
        Node.Status.DONE,
    }

    @classmethod
    def ancestor_chain(cls, node):
        """Return ancestors from root to immediate parent."""
        ancestors = []
        current = node.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return list(reversed(ancestors))

    @classmethod
    def descendant_ids(cls, node):
        """Collect descendant ids recursively for cycle validation."""
        descendants = set()
        stack = list(node.children.all())
        while stack:
            current = stack.pop()
            descendants.add(current.pk)
            stack.extend(current.children.all())
        return descendants

    @classmethod
    def validate_parent(cls, instance, parent):
        """Prevent self-parenting and ancestor cycles."""
        if not instance or not parent:
            return
        if parent.pk == instance.pk:
            raise ValidationError({"parent": "A node cannot be its own parent."})
        if parent.pk in cls.descendant_ids(instance):
            raise ValidationError(
                {"parent": "A node cannot be moved under one of its descendants."},
            )

    @classmethod
    def validate_dependencies(cls, instance, deps):
        """Reject self-dependencies and descendant dependencies."""
        if not instance:
            return
        descendant_ids = cls.descendant_ids(instance)
        for dep in deps:
            if dep.pk == instance.pk:
                raise ValidationError({"deps": "A node cannot depend on itself."})
            if dep.pk in descendant_ids:
                raise ValidationError(
                    {"deps": "A node cannot depend on one of its descendants."},
                )

    @classmethod
    def progress_pct(cls, node):
        """Calculate direct-child completion progress as an integer percent."""
        total_children = node.children.count()
        if total_children == 0:
            return 0
        done_children = node.children.filter(status=Node.Status.DONE).count()
        return int((done_children / total_children) * 100)

    @classmethod
    def calculate_status(cls, node):
        """Derive the current node status from dependencies and parent state."""
        if node.status == Node.Status.DONE:
            return Node.Status.DONE

        if node.deps.exclude(status=Node.Status.DONE).exists():
            return Node.Status.BLOCKED

        if node.parent and node.parent.status not in cls.parent_ready_statuses:
            return Node.Status.BLOCKED

        if node.status == Node.Status.ACTIVE:
            return Node.Status.ACTIVE

        return Node.Status.AVAILABLE

    @classmethod
    @transaction.atomic
    def refresh_all(cls):
        """Recompute blocked and available states until the graph stabilizes."""
        stabilized = False
        iterations = 0
        while not stabilized and iterations < 20:
            stabilized = True
            iterations += 1
            for node in Node.objects.select_related("parent").prefetch_related("deps"):
                new_status = cls.calculate_status(node)
                new_completed_at = node.completed_at
                if new_status == Node.Status.DONE and not new_completed_at:
                    new_completed_at = timezone.now()
                if new_status != Node.Status.DONE:
                    new_completed_at = None

                if node.status != new_status or node.completed_at != new_completed_at:
                    node.status = new_status
                    node.completed_at = new_completed_at
                    node.save(update_fields=["status", "completed_at", "updated_at"])
                    stabilized = False

    @classmethod
    @transaction.atomic
    def sync_kyrgyzstan_goal(cls, app_settings, independent_income_eur):
        """Auto-complete or reopen the independent-income goal from finance."""
        income_goal = Node.objects.filter(code=app_settings.independent_income_goal_code).first()
        if not income_goal:
            return

        target_reached = independent_income_eur >= app_settings.independent_income_target_eur
        desired_status = Node.Status.DONE if target_reached else Node.Status.ACTIVE

        if income_goal.status != desired_status:
            income_goal.status = desired_status
            income_goal.completed_at = timezone.now() if target_reached else None
            income_goal.save(update_fields=["status", "completed_at", "updated_at"])

        cls.refresh_all()


class TaskRecommendationService:
    """Return deterministic tool recommendations for actionable nodes."""

    automation_terms = {"automation", "automate", "webhook", "sync", "workflow", "integration", "pipeline", "n8n"}
    coding_terms = {"build", "code", "api", "backend", "frontend", "feature", "bug", "test", "refactor", "app"}
    ui_terms = {"ui", "screen", "layout", "design", "component", "interaction", "style", "visual"}
    thinking_terms = {"strategy", "diagnose", "diagnostic", "review", "plan", "proposal", "message", "write", "brief"}
    manual_terms = {"call", "meeting", "prayer", "family", "walk", "exercise", "read", "errand", "visit"}

    @classmethod
    def recommend(cls, node):
        """Choose a deterministic tool recommendation from node title and notes."""
        haystack = f"{node.title} {node.notes}".lower()
        tokens = set(haystack.replace("/", " ").replace("-", " ").split())

        if tokens & cls.automation_terms:
            return "n8n", "Automation-heavy work is best handled through a repeatable workflow."
        if tokens & cls.ui_terms:
            return "Cursor", "UI and interaction work benefit from a design-aware editing loop."
        if tokens & cls.coding_terms:
            return "Codex", "Implementation-heavy work is best handled in the coding workspace."
        if tokens & cls.thinking_terms or node.type in {Node.NodeType.GOAL, Node.NodeType.PROJECT}:
            return "Claude", "This work benefits from thinking, structuring, or drafting before execution."
        if tokens & cls.manual_terms:
            return "Manual", "This is best done directly in real life rather than through a software tool."
        return "Claude", "Start with structured thinking, then move into execution once the path is clear."


class GoalAttachmentSuggestionService:
    """Return deterministic support-layer suggestions for goal-like nodes."""

    @staticmethod
    def _normalize(items):
        seen = set()
        normalized = []
        for item in items:
            key = item["key"]
            if key in seen:
                continue
            seen.add(key)
            normalized.append(item)
        return normalized

    @classmethod
    def suggest(cls, node):
        """Suggest support layers that should exist around the selected node."""
        haystack = f"{node.title} {node.notes}".lower()
        suggestions = []

        if node.type in {Node.NodeType.GOAL, Node.NodeType.PROJECT, Node.NodeType.TASK}:
            suggestions.append(
                {
                    "key": "process",
                    "label": "Process",
                    "reason": "This work will be easier to repeat if the steps are written down clearly.",
                },
            )
            suggestions.append(
                {
                    "key": "tools",
                    "label": "Tools",
                    "reason": "A defined tool stack keeps execution faster and less mentally expensive.",
                },
            )

        if node.category in {Node.Category.CAREER, Node.Category.FINANCE, Node.Category.LEARNING}:
            suggestions.append(
                {
                    "key": "learning_path",
                    "label": "Learning Path",
                    "reason": "This domain often benefits from an explicit skill-building track.",
                },
            )

        if node.category in {Node.Category.HEALTH, Node.Category.SPIRITUAL} or any(
            term in haystack for term in ["habit", "consistency", "daily", "routine", "energy", "prayer"]
        ):
            suggestions.append(
                {
                    "key": "habits",
                    "label": "Habits",
                    "reason": "This looks like work that depends on recurring behavior, not just one-off action.",
                },
            )

        if node.category in {Node.Category.CAREER, Node.Category.FINANCE} or any(
            term in haystack for term in ["client", "proposal", "outreach", "audience", "lead", "pipeline"]
        ):
            suggestions.append(
                {
                    "key": "marketing_actions",
                    "label": "Marketing Actions",
                    "reason": "The work appears tied to visibility, client pursuit, or outbound momentum.",
                },
            )

        if any(term in haystack for term in ["family", "network", "mentor", "relationship", "collaborat"]):
            suggestions.append(
                {
                    "key": "supporting_people",
                    "label": "Supporting People",
                    "reason": "The result likely depends on keeping the right people visible around the plan.",
                },
            )

        return cls._normalize(suggestions)

    @classmethod
    def recommended_layer_keys(cls, node):
        """Return only the keys for persistent profile defaults."""
        return [item["key"] for item in cls.suggest(node)]


class GoalMapService:
    """Build the graph-style read model for the Goals map view."""

    @staticmethod
    def payload():
        """Return flat nodes and edges for goal, project, and task mapping."""
        nodes = list(
            Node.objects.select_related("parent").prefetch_related("deps").order_by("created_at"),
        )
        payload_nodes = [
            {
                "id": str(node.id),
                "code": node.code,
                "title": node.title,
                "type": node.type,
                "category": node.category,
                "status": node.status,
                "parent": str(node.parent_id) if node.parent_id else None,
                "progress_pct": NodeStatusService.progress_pct(node),
                "child_count": node.children.count(),
                "blocked_by": [dep.title for dep in node.deps.exclude(status=Node.Status.DONE)],
                "due_date": node.due_date.isoformat() if node.due_date else None,
                "manual_priority": node.manual_priority,
                "recommended_tool": TaskRecommendationService.recommend(node)[0],
                "tool_reasoning": TaskRecommendationService.recommend(node)[1],
            }
            for node in nodes
        ]
        edges = []
        for node in nodes:
            if node.parent_id:
                edges.append(
                    {
                        "source": str(node.parent_id),
                        "target": str(node.id),
                        "kind": "hierarchy",
                    },
                )
            for dep in node.deps.all():
                edges.append(
                    {
                        "source": str(dep.id),
                        "target": str(node.id),
                        "kind": "dependency",
                    },
                )

        return {
            "nodes": payload_nodes,
            "edges": edges,
            "summary": {
                "goal_count": sum(1 for node in nodes if node.type == Node.NodeType.GOAL),
                "project_count": sum(1 for node in nodes if node.type == Node.NodeType.PROJECT),
                "task_count": sum(
                    1 for node in nodes if node.type in {Node.NodeType.TASK, Node.NodeType.SUB_TASK}
                ),
                "blocked_count": sum(1 for node in nodes if node.status == Node.Status.BLOCKED),
            },
        }
