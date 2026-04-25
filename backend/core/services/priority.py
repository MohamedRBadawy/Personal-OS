# [AR] خدمة الأولويات — تحسب ترتيب الأهداف بناءً على التأثير والارتباط بالهدف الأكبر
# [EN] Priority service — ranks nodes by north-star alignment, due date, dependencies, and energy

from django.utils import timezone

from core.models import AppSettings
from goals.models import Node
from goals.services import NodeStatusService, TaskRecommendationService


class PriorityService:
    """Ranks the current system priorities for dashboard and command center use."""

    manual_priority_order = {
        Node.ManualPriority.HIGH: 0,
        Node.ManualPriority.MEDIUM: 1,
        Node.ManualPriority.LOW: 2,
        None: 3,
        "": 3,
    }
    status_order = {
        Node.Status.ACTIVE: 0,
        Node.Status.AVAILABLE: 1,
        Node.Status.BLOCKED: 2,
        Node.Status.DONE: 3,
    }
    low_energy_type_order = {
        Node.NodeType.SUB_TASK: 0,
        Node.NodeType.TASK: 1,
        Node.NodeType.PROJECT: 2,
        Node.NodeType.GOAL: 3,
    }
    normal_type_order = {
        Node.NodeType.TASK: 0,
        Node.NodeType.SUB_TASK: 1,
        Node.NodeType.PROJECT: 2,
        Node.NodeType.GOAL: 3,
    }

    @classmethod
    def _due_rank(cls, node, reference_date):
        if not node.due_date:
            return 999
        return (node.due_date - reference_date).days

    @classmethod
    def _north_star_rank(cls, node, app_settings):
        income_goal = Node.objects.filter(code=app_settings.independent_income_goal_code).first()
        if income_goal:
            if node.id == income_goal.id:
                return 0
            if income_goal in NodeStatusService.ancestor_chain(node):
                return 1
            if node.deps.filter(id=income_goal.id).exists() or node.dependents.filter(id=income_goal.id).exists():
                return 1

        haystack = f"{node.title} {node.notes}".lower()
        if node.category in {Node.Category.FINANCE, Node.Category.CAREER}:
            return 2
        if any(term in haystack for term in ["income", "client", "pipeline", "outreach", "proposal", "service"]):
            return 2
        return 3

    @classmethod
    def _energy_rank(cls, node, low_energy_today):
        if not low_energy_today:
            return 0
        if node.type in {Node.NodeType.GOAL, Node.NodeType.PROJECT}:
            return 2
        if node.manual_priority == Node.ManualPriority.HIGH or (
            node.due_date and node.due_date <= timezone.localdate()
        ):
            return 0
        return 1

    @classmethod
    def _type_rank(cls, node, low_energy_today):
        mapping = cls.low_energy_type_order if low_energy_today else cls.normal_type_order
        return mapping.get(node.type, 9)

    @classmethod
    def top_nodes(cls, *, reference_date, max_priorities, health_summary):
        app_settings = AppSettings.get_solo()
        nodes = list(
            Node.objects.select_related("parent")
            .prefetch_related("deps", "dependents")
            .filter(
                status__in=[Node.Status.ACTIVE, Node.Status.AVAILABLE],
                type__in=[
                    Node.NodeType.GOAL,
                    Node.NodeType.PROJECT,
                    Node.NodeType.TASK,
                    Node.NodeType.SUB_TASK,
                ],
            ),
        )
        low_energy_today = health_summary["low_energy_today"]
        ranked = sorted(
            nodes,
            key=lambda item: (
                cls._north_star_rank(item, app_settings),
                cls._due_rank(item, reference_date),
                -item.dependents.exclude(status=Node.Status.DONE).count(),
                cls.manual_priority_order.get(item.manual_priority, 3),
                cls._energy_rank(item, low_energy_today),
                cls.status_order.get(item.status, 9),
                cls._type_rank(item, low_energy_today),
                item.created_at,
            ),
        )
        return ranked[:max_priorities]

    @classmethod
    def serialize_priority(cls, node, reference_date):
        recommendation, reasoning = TaskRecommendationService.recommend(node)
        due_days = None
        if node.due_date:
            due_days = (node.due_date - reference_date).days
        return {
            "id": str(node.id),
            "code": node.code,
            "title": node.title,
            "type": node.type,
            "category": node.category,
            "status": node.status,
            "parent": str(node.parent_id) if node.parent_id else None,
            "parent_title": node.parent.title if node.parent else None,
            "notes": node.notes,
            "deps": [str(dep.id) for dep in node.deps.all()],
            "blocked_by_titles": list(node.deps.exclude(status=Node.Status.DONE).values_list("title", flat=True)),
            "ancestor_titles": [ancestor.title for ancestor in NodeStatusService.ancestor_chain(node)],
            "progress_pct": NodeStatusService.progress_pct(node),
            "effort": node.effort,
            "due_date": node.due_date.isoformat() if node.due_date else None,
            "manual_priority": node.manual_priority,
            "dependency_unblock_count": node.dependents.exclude(status=Node.Status.DONE).count(),
            "recommended_tool": recommendation,
            "tool_reasoning": reasoning,
            "is_overdue": bool(node.due_date and node.due_date < reference_date),
            "due_in_days": due_days,
        }
