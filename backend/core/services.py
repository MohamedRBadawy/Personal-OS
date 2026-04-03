"""Core orchestration services shared across endpoints."""
from django.db import transaction
from django.utils import timezone

from analytics.models.idea import Idea
from analytics.services import AISuggestionService, OverwhelmService, WeeklyReviewService
from core.ai import get_ai_provider
from core.models import AppSettings, DailyCheckIn, Profile
from finance.models import FinanceEntry
from finance.services import FinanceMetricsService
from goals.models import Node
from goals.serializers import NodeSerializer
from health.models.habit import Habit, HabitLog
from health.models.health_log import HealthLog
from health.models.mood_log import MoodLog
from health.models.spiritual_log import SpiritualLog
from health.services import HealthSummaryService
from pipeline.models import MarketingAction, Opportunity
from pipeline.services import OpportunityLifecycleService
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


class DashboardService:
    """Builds the composite home-screen payload for the frontend."""

    @staticmethod
    def _top_priority_nodes(max_priorities):
        nodes = list(
            Node.objects.filter(
                status__in=[Node.Status.ACTIVE, Node.Status.AVAILABLE],
                type__in=[Node.NodeType.GOAL, Node.NodeType.PROJECT, Node.NodeType.TASK],
            ).order_by("created_at"),
        )
        status_order = {
            Node.Status.ACTIVE: 0,
            Node.Status.AVAILABLE: 1,
            Node.Status.BLOCKED: 2,
            Node.Status.DONE: 3,
        }
        type_order = {
            Node.NodeType.GOAL: 0,
            Node.NodeType.PROJECT: 1,
            Node.NodeType.TASK: 2,
            Node.NodeType.SUB_TASK: 3,
            Node.NodeType.IDEA: 4,
            Node.NodeType.BURDEN: 5,
        }
        ranked = sorted(
            nodes,
            key=lambda item: (
                status_order.get(item.status, 9),
                type_order.get(item.type, 9),
                item.created_at,
            ),
        )
        return ranked[:max_priorities]

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
        top_priority_nodes = cls._top_priority_nodes(overwhelm_summary["max_priorities"])
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
