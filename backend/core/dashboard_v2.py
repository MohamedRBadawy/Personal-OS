"""Simplified dashboard endpoint for the redesigned Life OS."""
import datetime

from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from contacts.models import Contact
from core.models import AppSettings
from finance.models import FinanceSummary
from goals.models import Node
from health.services import HealthSummaryService
from journal.models import JournalEntry
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


def _health_pulse() -> dict:
    """Dashboard-scoped health summary — only the fields the home page needs."""
    try:
        s = HealthSummaryService.summary()
    except Exception:
        return {
            "avg_sleep_7d": None,
            "avg_mood_7d": None,
            "exercise_streak": 0,
            "full_prayer_streak": 0,
            "prayer_completion_rate_7d": None,
            "health_logged_today": False,
            "mood_logged_today": False,
            "spiritual_logged_today": False,
            "alerts": [],
        }

    alerts = []
    if s.get("low_sleep_today"):
        alerts.append("low_sleep")
    if (s.get("low_mood_streak") or 0) >= 2:
        alerts.append("low_mood")
    if (s.get("prayer_gap_streak") or 0) >= 2:
        alerts.append("prayer_gap")

    return {
        "avg_sleep_7d":              s.get("avg_sleep_7d"),
        "avg_mood_7d":               s.get("avg_mood_7d"),
        "exercise_streak":           s.get("exercise_streak", 0),
        "full_prayer_streak":        s.get("full_prayer_streak", 0),
        "prayer_completion_rate_7d": s.get("prayer_completion_rate_7d"),
        "health_logged_today":       s.get("health_logged_today", False),
        "mood_logged_today":         s.get("mood_logged_today", False),
        "spiritual_logged_today":    s.get("spiritual_logged_today", False),
        "alerts": alerts,
    }


def _journal_status() -> dict:
    """Whether today's journal entry exists and what tomorrow's focus is."""
    today = datetime.date.today()
    entry = JournalEntry.objects.filter(date=today).first()
    if not entry:
        return {"journaled_today": False, "tomorrow_focus": ""}
    has_content = bool(entry.mood_note or entry.gratitude or entry.wins)
    return {
        "journaled_today": has_content,
        "tomorrow_focus": (entry.tomorrow_focus or "")[:120],
    }


def _contacts_due() -> dict:
    """Count of overdue follow-ups and the top 3 most overdue contacts."""
    today = datetime.date.today()
    qs = Contact.objects.filter(next_followup__lte=today).order_by("next_followup")
    return {
        "count": qs.count(),
        "top": [
            {"id": c.id, "name": c.name, "relation": c.relation}
            for c in qs[:3]
        ],
    }


def _finance_detail(finance: FinanceSummary) -> dict:
    """Savings, debt and budget signals — uses already-loaded finance singleton."""
    savings_pct = None
    if finance.savings_target_egp and float(finance.savings_target_egp) > 0:
        savings_pct = round(
            (float(finance.savings_current_egp) / float(finance.savings_target_egp)) * 100
        )
    total_debt = sum(d.get("amount_egp", 0) for d in (finance.debts or []))
    return {
        "savings_current_egp": float(finance.savings_current_egp),
        "savings_target_egp":  float(finance.savings_target_egp),
        "savings_pct":         savings_pct,
        "total_debt_egp":      float(total_debt),
        "monthly_budget_egp":  float(finance.monthly_budget_egp) if finance.monthly_budget_egp else None,
    }


class DashboardV2View(APIView):
    """Aggregated dashboard data for the Command Center."""

    def get(self, request):
        finance = FinanceSummary.get()
        egp_rate = float(AppSettings.get_solo().eur_to_egp_rate)

        # Node counts by status
        counts = {
            row["status"]: row["cnt"]
            for row in Node.objects.values("status").annotate(cnt=Count("id"))
        }

        # Top 3 P1 tasks for the home page. "Active" work should still surface here,
        # not only tasks that happen to be marked "available".
        top_tasks_qs = (
            Node.objects.filter(
                type=Node.NodeType.TASK,
                priority=1,
                status__in=[Node.Status.AVAILABLE, Node.Status.ACTIVE],
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

        income_egp = round(float(finance.income_eur) * egp_rate + float(finance.income_egp_direct), 0)

        return Response({
            # ── Finance north-star ──────────────────────────────────────────
            "independent_monthly": float(finance.independent_monthly),
            "target_independent":  float(finance.target_independent),
            "income_eur":          float(finance.income_eur),
            "income_egp":          income_egp,
            "monthly_expenses_egp": float(finance.monthly_expenses_egp),
            "surplus_egp":         round(income_egp - float(finance.monthly_expenses_egp), 0),
            # ── Goals ───────────────────────────────────────────────────────
            "node_counts": {
                "active":   counts.get("active", 0),
                "available": counts.get("available", 0),
                "blocked":  counts.get("blocked", 0),
                "done":     counts.get("done", 0),
                "deferred": counts.get("deferred", 0),
                "total":    sum(counts.values()),
            },
            "top_tasks":     top_tasks,
            "blocked_goals": blocked_goals,
            # ── Life OS milestones ──────────────────────────────────────────
            "milestones":    _milestone_flags(finance),
            # ── Today pulse ─────────────────────────────────────────────────
            "routine_today": _routine_today(),
            "health_pulse":  _health_pulse(),
            "journal_status": _journal_status(),
            "contacts_due":  _contacts_due(),
            # ── Finance detail ───────────────────────────────────────────────
            "finance_detail": _finance_detail(finance),
        })
