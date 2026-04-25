# [AR] خدمة تسجيل البيانات اليومية — تكتب في صحة ومزاج وتمويل وأفكار وأهداف
# [EN] Daily check-in service — fans submitted payload into health, mood, finance, ideas, goals

from django.db import transaction
from django.utils import timezone

from analytics.models.idea import Idea
from analytics.services import AISuggestionService
from core.ai import get_ai_provider
from core.models import DailyCheckIn, Profile
from finance.models import FinanceEntry
from finance.services import FinanceMetricsService
from goals.models import Node
from health.models.health_log import HealthLog
from health.models.mood_log import MoodLog
from health.services import HealthSummaryService


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
