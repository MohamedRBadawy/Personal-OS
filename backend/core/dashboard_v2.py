"""Simplified dashboard endpoint for the redesigned Life OS."""
from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from finance.models import FinanceSummary
from goals.models import Node
from schedule.models import RoutineLog


def _milestone_flags(finance: FinanceSummary) -> list:
    """Return milestone list with completion status."""
    ind = float(finance.independent_monthly)

    # Lookup specific goal nodes by code
    def node_done(code):
        try:
            return Node.objects.get(code=code).status == Node.Status.DONE
        except Node.DoesNotExist:
            return False

    milestones = [
        {"label": "Audit offer written", "done": True},
        {
            "label": "Outreach sent to contact #1",
            "done": node_done("t2"),
        },
        {
            "label": "First audit client (€150)",
            "done": ind > 0,
        },
        {
            "label": "First independent income",
            "done": ind > 0,
        },
        {
            "label": "Noise situation resolved",
            "done": node_done("g4"),
        },
        {
            "label": "€1,000/mo independent income",
            "done": ind >= 1000,
        },
        {
            "label": "Move to Kyrgyzstan",
            "done": node_done("g1"),
        },
    ]

    # Mark the first non-done item as "next"
    next_found = False
    for m in milestones:
        if not m["done"] and not next_found:
            m["next"] = True
            next_found = True
        else:
            m["next"] = False
    return milestones


def _routine_today() -> dict:
    today = timezone.localdate()
    total = 20
    done = RoutineLog.objects.filter(date=today, status__in=["done", "partial"]).count()
    return {"done": done, "total": total, "pct": round((done / total) * 100)}


class DashboardV2View(APIView):
    """Aggregated dashboard data for the Command Center."""

    def get(self, request):
        finance = FinanceSummary.get()

        # Node counts by status
        counts = {
            row["status"]: row["cnt"]
            for row in Node.objects.values("status").annotate(cnt=Count("id"))
        }

        # Top 3 P1 tasks (priority=1, type=task, status=available)
        top_tasks_qs = (
            Node.objects.filter(
                type=Node.NodeType.TASK,
                status=Node.Status.AVAILABLE,
                priority=1,
            )
            .prefetch_related("deps")
            .order_by("target_date", "created_at")[:3]
        )
        top_tasks = []
        for node in top_tasks_qs:
            dep_titles = list(
                node.deps.exclude(status=Node.Status.DONE).values_list("title", flat=True)
            )
            top_tasks.append({
                "id": node.id,
                "title": node.title,
                "status": node.status,
                "effort": node.effort,
                "target_date": node.target_date,
                "tags": node.tags or [],
                "notes": (node.notes or "")[:80],
                "blocked_by": dep_titles,
            })

        # Blocked goals
        blocked_goals_qs = Node.objects.filter(
            type=Node.NodeType.GOAL,
            status=Node.Status.BLOCKED,
        ).prefetch_related("deps")
        blocked_goals = []
        for node in blocked_goals_qs:
            dep_titles = list(node.deps.values_list("title", flat=True))
            blocked_goals.append({
                "id": node.id,
                "title": node.title,
                "blocked_by": dep_titles,
            })

        return Response({
            "independent_monthly": float(finance.independent_monthly),
            "target_independent": float(finance.target_independent),
            "income_eur": float(finance.income_eur),
            "income_egp": round(float(finance.income_eur) * 60 + float(finance.income_egp_direct), 0),
            "monthly_expenses_egp": float(finance.monthly_expenses_egp),
            "surplus_egp": round(float(finance.income_eur) * 60 + float(finance.income_egp_direct) - float(finance.monthly_expenses_egp), 0),
            "node_counts": {
                "active": counts.get("active", 0),
                "available": counts.get("available", 0),
                "blocked": counts.get("blocked", 0),
                "done": counts.get("done", 0),
                "deferred": counts.get("deferred", 0),
                "total": sum(counts.values()),
            },
            "top_tasks": top_tasks,
            "blocked_goals": blocked_goals,
            "milestones": _milestone_flags(finance),
            "routine_today": _routine_today(),
        })
