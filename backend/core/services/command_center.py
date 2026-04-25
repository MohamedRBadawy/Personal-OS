# [AR] خدمة مركز القيادة — تجمع البيانات الكاملة لمساحة العمل الرئيسية
# [EN] Command center service — assembles the unified primary workspace payload

from django.utils import timezone

from analytics.models.achievement import Achievement
from analytics.models.ai_suggestion import AISuggestion
from analytics.services import AISuggestionService, OverwhelmService, WeeklyReviewService
from core.ai import get_ai_provider
from core.models import AppSettings, DailyCheckIn, Profile
from core.services.priority import PriorityService
from finance.models import FinanceEntry
from finance.services import FinanceMetricsService
from goals.models import Node
from health.services import HealthSummaryService
from pipeline.models import Opportunity
from pipeline.services import PipelineWorkspaceService
from schedule.services import TodayScheduleService


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
            "prior_commitments_due": [
                {
                    "id": str(commitment.id),
                    "action_type": commitment.action_type,
                    "description": commitment.description,
                    "from_week": commitment.review.week_start.isoformat(),
                }
                for commitment in WeeklyReviewService.get_prior_commitments(reference_date)
            ],
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
