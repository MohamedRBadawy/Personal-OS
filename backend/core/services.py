"""Core orchestration services shared across endpoints."""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from analytics.models.achievement import Achievement
from analytics.models.ai_suggestion import AISuggestion
from analytics.models.idea import Idea
from analytics.services import AISuggestionService, OverwhelmService, WeeklyReviewService
from core.ai import get_ai_provider
from core.models import AppSettings, DailyCheckIn, Profile
from finance.models import FinanceEntry
from finance.services import FinanceMetricsService
from goals.models import Node
from goals.serializers import NodeSerializer
from goals.services import NodeStatusService, TaskRecommendationService
from health.models.habit import Habit, HabitLog
from health.models.health_log import HealthLog
from health.models.mood_log import MoodLog
from health.models.spiritual_log import SpiritualLog
from health.services import HealthSummaryService
from pipeline.models import MarketingAction, Opportunity
from pipeline.services import OpportunityLifecycleService, PipelineWorkspaceService
from schedule.services import TodayScheduleService


class CheckInService:
    """Persists the daily check-in and fans it into domain records."""

    @staticmethod
    def _title_from_text(text, fallback):
        cleaned = (text or "").strip()
        if not cleaned:
            return fallback
        return cleaned.split(".")[0][:255]

    @classmethod
    @transaction.atomic
    def submit(cls, payload):
        """Create or update all records affected by the daily check-in."""
        checkin_date = payload.get("date", timezone.localdate())
        inbox_text = payload.get("inbox_text", "")
        blockers_text = payload.get("blockers_text", "")

        health_log, _ = HealthLog.objects.update_or_create(
            date=checkin_date,
            defaults={
                "sleep_hours": payload["sleep_hours"],
                "sleep_quality": payload["sleep_quality"],
                "energy_level": payload["energy_level"],
                "exercise_done": payload.get("exercise_done", False),
                "exercise_type": payload.get("exercise_type", ""),
                "exercise_duration_mins": payload.get("exercise_duration_mins"),
            },
        )

        mood_log = None
        if payload.get("mood_score") is not None:
            mood_log, _ = MoodLog.objects.update_or_create(
                date=checkin_date,
                defaults={"mood_score": payload["mood_score"]},
            )

        finance_entries = []
        for delta in payload.get("finance_deltas", []):
            entry = FinanceEntry.objects.create(
                date=delta.get("date", checkin_date),
                type=delta["type"],
                source=delta["source"],
                amount=delta["amount"],
                currency=delta["currency"],
                is_independent=delta.get("is_independent", False),
                is_recurring=delta.get("is_recurring", False),
                notes=delta.get("notes", ""),
            )
            finance_entries.append(entry)

        idea = None
        if inbox_text:
            title = cls._title_from_text(inbox_text, "Inbox capture")
            idea, _ = Idea.objects.get_or_create(
                title=title,
                context=inbox_text,
                status=Idea.Status.RAW,
            )

        blocker = None
        if blockers_text:
            blocker, _ = Node.objects.get_or_create(
                title=cls._title_from_text(blockers_text, "Captured blocker"),
                type=Node.NodeType.BURDEN,
                defaults={
                    "category": Node.Category.LIFE,
                    "status": Node.Status.ACTIVE,
                    "notes": blockers_text,
                },
            )

        FinanceMetricsService.sync_goal_status()
        finance_summary = FinanceMetricsService.summary(reference_date=checkin_date)
        health_summary = HealthSummaryService.summary(reference_date=checkin_date)
        priorities = list(
            Node.objects.filter(
                status__in=[Node.Status.ACTIVE, Node.Status.AVAILABLE],
                type__in=[Node.NodeType.GOAL, Node.NodeType.PROJECT, Node.NodeType.TASK],
            ).values_list("title", flat=True)[:3],
        )

        provider = get_ai_provider()
        profile = Profile.objects.first()
        briefing = provider.generate_morning_briefing(
            profile=profile,
            finance_summary=finance_summary,
            health_summary=health_summary,
            top_priorities=priorities,
            blockers_text=blockers_text,
        )

        checkin, _ = DailyCheckIn.objects.update_or_create(
            date=checkin_date,
            defaults={
                "inbox_text": inbox_text,
                "blockers_text": blockers_text,
                "briefing_text": briefing["briefing_text"],
            },
        )
        AISuggestionService.generate_for_checkin(reference_date=checkin_date)

        return {
            "checkin": checkin,
            "health_log": health_log,
            "mood_log": mood_log,
            "finance_entries": finance_entries,
            "idea": idea,
            "blocker": blocker,
            "briefing": briefing,
            "finance_summary": finance_summary,
            "health_summary": health_summary,
        }


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
            "due_date": node.due_date.isoformat() if node.due_date else None,
            "manual_priority": node.manual_priority,
            "dependency_unblock_count": node.dependents.exclude(status=Node.Status.DONE).count(),
            "recommended_tool": recommendation,
            "tool_reasoning": reasoning,
            "is_overdue": bool(node.due_date and node.due_date < reference_date),
            "due_in_days": due_days,
        }


class DashboardService:
    """Builds the composite home-screen payload for the frontend."""

    @staticmethod
    def _top_priority_nodes(reference_date, max_priorities, health_summary):
        return PriorityService.top_nodes(
            reference_date=reference_date,
            max_priorities=max_priorities,
            health_summary=health_summary,
        )

    @staticmethod
    def _today_snapshot(reference_date):
        health_log = HealthLog.objects.filter(date=reference_date).first()
        mood_log = MoodLog.objects.filter(date=reference_date).first()
        spiritual_log = SpiritualLog.objects.filter(date=reference_date).first()
        month_start = reference_date.replace(day=1)
        return {
            "active_project_count": Node.objects.filter(
                type=Node.NodeType.PROJECT,
                status=Node.Status.ACTIVE,
            ).count(),
            "blocked_goal_count": Node.objects.filter(
                type=Node.NodeType.GOAL,
                status=Node.Status.BLOCKED,
            ).count(),
            "available_task_count": Node.objects.filter(
                type__in=[Node.NodeType.TASK, Node.NodeType.SUB_TASK],
                status=Node.Status.AVAILABLE,
            ).count(),
            "sleep_hours_today": float(health_log.sleep_hours) if health_log else None,
            "energy_level_today": health_log.energy_level if health_log else None,
            "mood_score_today": mood_log.mood_score if mood_log else None,
            "completed_habits_today": HabitLog.objects.filter(date=reference_date, done=True).count(),
            "total_habits": Habit.objects.count(),
            "prayers_count_today": spiritual_log.prayers_count if spiritual_log else 0,
            "marketing_actions_this_month": MarketingAction.objects.filter(
                date__gte=month_start,
                date__lte=reference_date,
            ).count(),
            "active_leads_count": Opportunity.objects.filter(
                status__in=[Opportunity.Status.NEW, Opportunity.Status.REVIEWING],
            ).count(),
        }

    @staticmethod
    def _schedule_snapshot(reference_date):
        schedule = TodayScheduleService.payload(reference_date)
        return {
            "date": schedule["date"],
            "reduced_mode": schedule["reduced_mode"],
            "low_energy_today": schedule["low_energy_today"],
            "due_follow_ups_count": schedule["summary"]["due_follow_ups_count"],
            "pending_count": schedule["summary"]["pending_count"],
            "blocks": [
                {
                    "id": block["id"],
                    "time": block["time"],
                    "label": block["label"],
                    "type": block["type"],
                    "status": block["log"]["status"] if block["log"] else "pending",
                    "suggestion_label": (
                        block["suggestion"]["goal_node"]["title"]
                        if block["suggestion"] and block["suggestion"]["goal_node"]
                        else (
                            block["suggestion"]["marketing_action"]["action"]
                            if block["suggestion"] and block["suggestion"]["marketing_action"]
                            else None
                        )
                    ),
                    "suggestion_kind": block["suggestion"]["kind"] if block["suggestion"] else None,
                }
                for block in schedule["blocks"][:5]
            ],
        }

    @classmethod
    def payload(cls, reference_date=None):
        """Assemble the dashboard payload consumed by the home screen."""
        reference_date = reference_date or timezone.localdate()
        profile = Profile.objects.first()
        settings_obj = AppSettings.get_solo()
        finance_summary = FinanceMetricsService.summary(reference_date)
        health_summary = HealthSummaryService.summary(reference_date)
        overwhelm_summary = OverwhelmService.summary(reference_date)
        top_priority_nodes = cls._top_priority_nodes(
            reference_date,
            overwhelm_summary["max_priorities"],
            health_summary,
        )
        weekly_review_preview = WeeklyReviewService.preview(reference_date)
        pipeline_summary = OpportunityLifecycleService.summary()
        latest_checkin = DailyCheckIn.objects.order_by("-date").first()

        provider = get_ai_provider()
        briefing = provider.generate_morning_briefing(
            profile=profile,
            finance_summary=finance_summary,
            health_summary=health_summary,
            top_priorities=[item.title for item in top_priority_nodes],
            blockers_text=latest_checkin.blockers_text if latest_checkin else "",
        )
        if latest_checkin and latest_checkin.briefing_text:
            briefing["briefing_text"] = latest_checkin.briefing_text

        combined_signals = []
        for signal in [*briefing.get("observations", []), *overwhelm_summary.get("signals", [])]:
            if signal not in combined_signals:
                combined_signals.append(signal)
        review_status = WeeklyReviewService.status(reference_date)
        suggestions_summary = AISuggestionService.summary()

        return {
            "date": reference_date.isoformat(),
            "profile": (
                {
                    "id": str(profile.id),
                    "full_name": profile.full_name,
                    "location": profile.location,
                    "timezone": profile.timezone,
                    "background": profile.background,
                    "cognitive_style": profile.cognitive_style,
                    "family_context": profile.family_context,
                    "life_focus": profile.life_focus,
                } if profile else None
            ),
            "settings": (
                {
                    "id": str(settings_obj.id),
                    "name": settings_obj.name,
                    "independent_income_target_eur": settings_obj.independent_income_target_eur,
                    "employment_income_source_name": settings_obj.employment_income_source_name,
                    "timezone": settings_obj.timezone,
                    "eur_to_usd_rate": settings_obj.eur_to_usd_rate,
                    "eur_to_egp_rate": settings_obj.eur_to_egp_rate,
                } if settings_obj else None
            ),
            "briefing": briefing,
            "key_signals": combined_signals,
            "finance_summary": finance_summary,
            "health_summary": health_summary,
            "overwhelm": overwhelm_summary,
            "top_priorities": NodeSerializer(top_priority_nodes, many=True).data,
            "pipeline_summary": pipeline_summary,
            "today_snapshot": cls._today_snapshot(reference_date),
            "schedule_snapshot": cls._schedule_snapshot(reference_date),
            "review_status": review_status,
            "suggestions_summary": suggestions_summary,
            "weekly_review_preview": {
                "week_start": weekly_review_preview["week_start"].isoformat(),
                "week_end": weekly_review_preview["week_end"].isoformat(),
                "snippet": " ".join(
                    weekly_review_preview["report"].splitlines()[:3],
                ),
                "report": weekly_review_preview["report"],
            },
            "latest_checkin": (
                {
                    "id": str(latest_checkin.id),
                    "date": latest_checkin.date.isoformat(),
                    "inbox_text": latest_checkin.inbox_text,
                    "blockers_text": latest_checkin.blockers_text,
                } if latest_checkin else None
            ),
        }


class CommandCenterService:
    """Build the unified command-center payload for the primary home workspace."""

    @staticmethod
    def _serialize_profile(profile):
        if not profile:
            return None
        return {
            "id": str(profile.id),
            "full_name": profile.full_name,
            "location": profile.location,
            "timezone": profile.timezone,
            "background": profile.background,
            "cognitive_style": profile.cognitive_style,
            "family_context": profile.family_context,
            "life_focus": profile.life_focus,
        }

    @staticmethod
    def _serialize_settings(settings_obj):
        if not settings_obj:
            return None
        return {
            "id": str(settings_obj.id),
            "name": settings_obj.name,
            "independent_income_target_eur": settings_obj.independent_income_target_eur,
            "employment_income_source_name": settings_obj.employment_income_source_name,
            "timezone": settings_obj.timezone,
            "eur_to_usd_rate": settings_obj.eur_to_usd_rate,
            "eur_to_egp_rate": settings_obj.eur_to_egp_rate,
        }

    @staticmethod
    def _serialize_finance_entry(entry):
        return {
            "id": str(entry.id),
            "type": entry.type,
            "source": entry.source,
            "amount": str(entry.amount),
            "amount_eur": round(FinanceMetricsService.convert_to_eur(entry.amount, entry.currency), 2),
            "currency": entry.currency,
            "is_independent": entry.is_independent,
            "is_recurring": entry.is_recurring,
            "date": entry.date.isoformat(),
            "notes": entry.notes,
        }

    @staticmethod
    def _combined_signals(briefing, overwhelm_summary):
        combined = []
        for signal in [*briefing.get("observations", []), *overwhelm_summary.get("signals", [])]:
            if signal not in combined:
                combined.append(signal)
        return combined

    @staticmethod
    def _recent_progress():
        items = []

        for node in Node.objects.filter(status=Node.Status.DONE).order_by("-completed_at", "-updated_at")[:5]:
            date_value = node.completed_at.date() if node.completed_at else timezone.localdate()
            items.append(
                {
                    "id": f"node-{node.id}",
                    "kind": "completion",
                    "domain": node.category or "Goals",
                    "title": node.title,
                    "detail": f"{node.get_type_display()} completed.",
                    "date": date_value.isoformat(),
                },
            )

        for achievement in Achievement.objects.order_by("-date", "-created_at")[:5]:
            items.append(
                {
                    "id": f"achievement-{achievement.id}",
                    "kind": "win",
                    "domain": achievement.domain,
                    "title": achievement.title,
                    "detail": achievement.notes or "Achievement recorded.",
                    "date": achievement.date.isoformat(),
                },
            )

        for opportunity in Opportunity.objects.filter(status=Opportunity.Status.WON).order_by("-date_closed", "-updated_at")[:3]:
            if not opportunity.date_closed:
                continue
            items.append(
                {
                    "id": f"opportunity-{opportunity.id}",
                    "kind": "win",
                    "domain": "Pipeline",
                    "title": opportunity.name,
                    "detail": "Opportunity won and converted into a client flow.",
                    "date": opportunity.date_closed.isoformat(),
                },
            )

        items.sort(key=lambda item: item["date"], reverse=True)
        return items[:8]

    @staticmethod
    def _status_cards(*, finance_summary, health_today, schedule, pipeline, review_status, suggestions_summary):
        spiritual_log = health_today["spiritual_log"] or {}
        prayer_count = spiritual_log.get("prayers_count", 0)
        total_nodes = Node.objects.filter(
            type__in=[Node.NodeType.GOAL, Node.NodeType.PROJECT, Node.NodeType.TASK, Node.NodeType.SUB_TASK],
        ).count()
        done_nodes = Node.objects.filter(status=Node.Status.DONE).count()
        blocked_nodes = Node.objects.filter(status=Node.Status.BLOCKED).count()
        available_nodes = Node.objects.filter(status__in=[Node.Status.ACTIVE, Node.Status.AVAILABLE]).count()

        return [
            {
                "id": "goals",
                "label": "Goals and tasks",
                "value": done_nodes,
                "total": total_nodes,
                "status": "warning" if blocked_nodes else "clear",
                "detail": f"{blocked_nodes} blocked · {available_nodes} ready now",
                "route": "/goals",
            },
            {
                "id": "schedule",
                "label": "Today's schedule",
                "value": schedule["summary"]["done_count"],
                "total": len(schedule["blocks"]),
                "status": "attention" if schedule["summary"]["pending_count"] else "clear",
                "detail": f"{schedule['summary']['pending_count']} pending · {schedule['summary']['skipped_count']} skipped",
                "route": "/",
            },
            {
                "id": "habits",
                "label": "Habits",
                "value": health_today["summary"]["habits_completed_today"],
                "total": health_today["summary"]["active_habits_count"],
                "status": "attention" if not health_today["summary"]["health_logged_today"] else "clear",
                "detail": f"{health_today['summary']['habit_completion_rate_7d'] or 0}% over the last 7 days",
                "route": "/health?tab=habits",
            },
            {
                "id": "spiritual",
                "label": "Prayer and spiritual",
                "value": prayer_count,
                "total": 5,
                "status": "warning" if prayer_count < 5 else "clear",
                "detail": "Today's prayer count and spiritual anchor.",
                "route": "/health?tab=spiritual",
            },
            {
                "id": "finance",
                "label": "Independent income",
                "value": finance_summary["independent_income_eur"],
                "total": float(finance_summary["target_eur"]),
                "status": "attention" if finance_summary["kyrgyzstan_progress_pct"] < 100 else "clear",
                "detail": f"Net this month: {finance_summary['net_eur']} EUR",
                "route": "/finance",
            },
            {
                "id": "pipeline",
                "label": "Pipeline pressure",
                "value": pipeline["summary"]["due_follow_ups_count"],
                "total": pipeline["summary"]["new_or_reviewing_count"],
                "status": "warning" if pipeline["summary"]["empty_pipeline"] else "attention" if pipeline["summary"]["due_follow_ups_count"] else "clear",
                "detail": f"{pipeline['summary']['new_or_reviewing_count']} active leads",
                "route": "/work?tab=pipeline",
            },
            {
                "id": "review",
                "label": "Weekly review",
                "value": suggestions_summary["pending_count"],
                "total": 3,
                "status": "attention" if not review_status["review_exists"] or suggestions_summary["pending_count"] else "clear",
                "detail": "Pending suggestions and weekly closeout readiness.",
                "route": "/timeline?tab=review",
            },
        ]

    @staticmethod
    def _reentry(*, reference_date, latest_checkin, pipeline, top_priorities, review_status):
        if not latest_checkin:
            return {"active": False, "days_away": 0, "message": "", "what_changed": [], "matters_now": [], "can_wait": []}

        days_away = (reference_date - latest_checkin.date).days
        if days_away < 2:
            return {"active": False, "days_away": days_away, "message": "", "what_changed": [], "matters_now": [], "can_wait": []}

        what_changed = []
        if pipeline["summary"]["due_follow_ups_count"]:
            what_changed.append(f"{pipeline['summary']['due_follow_ups_count']} follow-up item(s) are due.")
        if not review_status["review_exists"]:
            what_changed.append("The current weekly review is still open.")
        if not what_changed:
            what_changed.append("The system recalculated from the current state instead of where you left off.")

        matters_now = [item.title for item in top_priorities[:2]]
        can_wait = []
        blocked_goals = Node.objects.filter(type=Node.NodeType.GOAL, status=Node.Status.BLOCKED).count()
        if blocked_goals:
            can_wait.append(f"{blocked_goals} blocked goal(s) can wait until an active path clears.")
        can_wait.append("Secondary workspaces can stay collapsed until the main flow is stable again.")

        return {
            "active": True,
            "days_away": days_away,
            "message": f"You've been away for {days_away} days. Here's what changed, what matters now, and what can wait.",
            "what_changed": what_changed,
            "matters_now": matters_now,
            "can_wait": can_wait,
        }

    @classmethod
    def payload(cls, reference_date=None):
        """Assemble the primary command-center payload."""
        reference_date = reference_date or timezone.localdate()
        profile = Profile.objects.first()
        settings_obj = AppSettings.get_solo()
        finance_summary = FinanceMetricsService.summary(reference_date)
        health_summary = HealthSummaryService.summary(reference_date)
        health_today = HealthSummaryService.today_workspace(reference_date)
        overwhelm_summary = OverwhelmService.summary(reference_date)
        top_priority_nodes = PriorityService.top_nodes(
            reference_date=reference_date,
            max_priorities=overwhelm_summary["max_priorities"],
            health_summary=health_summary,
        )
        schedule = TodayScheduleService.payload(reference_date)
        pipeline = PipelineWorkspaceService.payload(reference_date)
        review_status = WeeklyReviewService.status(reference_date)
        weekly_review_preview = WeeklyReviewService.preview(reference_date)
        suggestions_summary = AISuggestionService.summary()
        pending_suggestions = list(
            AISuggestion.objects.filter(acted_on=False, dismissed_at__isnull=True)
            .order_by("-shown_at")
            .values("id", "topic", "module", "suggestion_text", "shown_at")[:4],
        )
        latest_checkin = DailyCheckIn.objects.order_by("-date").first()

        provider = get_ai_provider()
        briefing = provider.generate_morning_briefing(
            profile=profile,
            finance_summary=finance_summary,
            health_summary=health_summary,
            top_priorities=[item.title for item in top_priority_nodes],
            blockers_text=latest_checkin.blockers_text if latest_checkin else "",
        )
        if latest_checkin and latest_checkin.briefing_text:
            briefing["briefing_text"] = latest_checkin.briefing_text

        return {
            "date": reference_date.isoformat(),
            "profile": cls._serialize_profile(profile),
            "settings": cls._serialize_settings(settings_obj),
            "briefing": briefing,
            "key_signals": cls._combined_signals(briefing, overwhelm_summary),
            "overwhelm": overwhelm_summary,
            "reentry": cls._reentry(
                reference_date=reference_date,
                latest_checkin=latest_checkin,
                pipeline=pipeline,
                top_priorities=top_priority_nodes,
                review_status=review_status,
            ),
            "priorities": [PriorityService.serialize_priority(node, reference_date) for node in top_priority_nodes],
            "top_priorities": [PriorityService.serialize_priority(node, reference_date) for node in top_priority_nodes],
            "schedule": schedule,
            "health_today": health_today,
            "finance": {
                "summary": finance_summary,
                "recent_entries": [
                    cls._serialize_finance_entry(entry)
                    for entry in FinanceEntry.objects.order_by("-date", "-created_at")[:5]
                ],
            },
            "pipeline": pipeline,
            "weekly_review": {
                "status": review_status,
                "preview": {
                    "week_start": weekly_review_preview["week_start"].isoformat(),
                    "week_end": weekly_review_preview["week_end"].isoformat(),
                    "report": weekly_review_preview["report"],
                    "snippet": " ".join(weekly_review_preview["report"].splitlines()[:3]),
                },
                "pending_suggestions_count": suggestions_summary["pending_count"],
                "pending_suggestions": [
                    {
                        **item,
                        "id": str(item["id"]),
                        "shown_at": item["shown_at"].isoformat(),
                    }
                    for item in pending_suggestions
                ],
            },
            "status_cards": cls._status_cards(
                finance_summary=finance_summary,
                health_today=health_today,
                schedule=schedule,
                pipeline=pipeline,
                review_status=review_status,
                suggestions_summary=suggestions_summary,
            ),
            "recent_progress": cls._recent_progress(),
            "latest_checkin": (
                {
                    "id": str(latest_checkin.id),
                    "date": latest_checkin.date.isoformat(),
                    "inbox_text": latest_checkin.inbox_text,
                    "blockers_text": latest_checkin.blockers_text,
                }
                if latest_checkin
                else None
            ),
        }
