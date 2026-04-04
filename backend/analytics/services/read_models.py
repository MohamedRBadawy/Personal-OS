"""Read-model services for analytics overview and timeline views."""
from datetime import timedelta

from django.utils import timezone

from analytics.models.achievement import Achievement
from analytics.models.decision_log import DecisionLog
from analytics.models.family_goal import FamilyGoal
from analytics.models.idea import Idea
from analytics.models.learning import Learning
from analytics.models.project_retrospective import ProjectRetrospective
from analytics.models.relationship import Relationship
from analytics.services.overwhelm import OverwhelmService
from analytics.services.reviews import WeeklyReviewService
from core.ai import get_ai_provider
from finance.models import FinanceEntry
from finance.services import FinanceMetricsService
from goals.models import Node
from health.models.habit import HabitLog
from health.models.health_log import HealthLog
from health.models.mood_log import MoodLog
from health.models.spiritual_log import SpiritualLog
from health.services import HealthSummaryService
from pipeline.models import MarketingAction, Opportunity
from pipeline.services import OpportunityLifecycleService


class AnalyticsOverviewService:
    """Builds the read model used by the Analytics page."""

    history_limit = 80

    @staticmethod
    def _history_rows():
        rows = []
        rows.extend(
            {
                "id": str(item.id),
                "date": item.date.isoformat(),
                "domain": "Health",
                "title": f"Sleep {item.sleep_hours}h - Energy {item.energy_level}/5",
                "detail": item.exercise_type or item.nutrition_notes,
            }
            for item in HealthLog.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.extend(
            {
                "id": str(item.id),
                "date": item.date.isoformat(),
                "domain": "Mood",
                "title": f"Mood {item.mood_score}/5",
                "detail": item.notes,
            }
            for item in MoodLog.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.extend(
            {
                "id": str(item.id),
                "date": item.date.isoformat(),
                "domain": "Spiritual",
                "title": f"{item.prayers_count}/5 prayers",
                "detail": f"Quran {item.quran_pages} page(s)",
            }
            for item in SpiritualLog.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.extend(
            {
                "id": str(item.id),
                "date": item.date.isoformat(),
                "domain": "Finance",
                "title": (
                    f"{'+' if item.type == FinanceEntry.EntryType.INCOME else '-'}"
                    f"{item.amount} {item.currency} - {item.source}"
                ),
                "detail": item.notes,
            }
            for item in FinanceEntry.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.extend(
            {
                "id": str(item.id),
                "date": item.date.isoformat(),
                "domain": "Marketing",
                "title": item.action,
                "detail": item.result,
            }
            for item in MarketingAction.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.extend(
            {
                "id": str(item.id),
                "date": item.date.isoformat(),
                "domain": "Decision",
                "title": item.decision,
                "detail": item.reasoning,
            }
            for item in DecisionLog.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.extend(
            {
                "id": str(item.id),
                "date": item.date.isoformat(),
                "domain": "Achievement",
                "title": item.title,
                "detail": item.notes,
            }
            for item in Achievement.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.extend(
            {
                "id": str(item.id),
                "date": item.date_found.isoformat(),
                "domain": "Pipeline",
                "title": f"{item.name} - {item.status}",
                "detail": item.fit_reasoning or item.outcome_notes,
            }
            for item in Opportunity.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.extend(
            {
                "id": str(item.id),
                "date": item.created_at.date().isoformat(),
                "domain": "Idea",
                "title": item.title,
                "detail": item.context,
            }
            for item in Idea.objects.all()[: AnalyticsOverviewService.history_limit]
        )
        rows.sort(key=lambda row: (row["date"], row["domain"], row["title"]), reverse=True)
        return rows[: AnalyticsOverviewService.history_limit]

    @classmethod
    def payload(cls, reference_date=None):
        """Assemble the aggregate payload for the Analytics page."""
        reference_date = reference_date or timezone.localdate()
        finance = FinanceMetricsService.summary(reference_date)
        health = HealthSummaryService.summary(reference_date)
        pipeline = OpportunityLifecycleService.summary()
        counts = {
            "health_logs": HealthLog.objects.count(),
            "mood_logs": MoodLog.objects.count(),
            "spiritual_logs": SpiritualLog.objects.count(),
            "habit_logs": HabitLog.objects.count(),
            "marketing_actions": MarketingAction.objects.count(),
            "ideas": Idea.objects.count(),
            "decisions": DecisionLog.objects.count(),
            "achievements": Achievement.objects.count(),
            "relationships": Relationship.objects.count(),
            "family_goals": FamilyGoal.objects.count(),
            "learning_items": Learning.objects.count(),
            "opportunities": Opportunity.objects.count(),
        }
        overview = {
            "date": reference_date.isoformat(),
            "health": health,
            "finance": finance,
            "pipeline": pipeline,
            "counts": counts,
            "history": cls._history_rows(),
        }
        overview["pattern_analysis"] = get_ai_provider().analyze_patterns(overview=overview)
        return overview


class TimelineService:
    """Build the 7-day timeline payload for the frontend."""

    @staticmethod
    def _week_start(reference_date):
        return reference_date - timedelta(days=reference_date.weekday())

    @staticmethod
    def _detail_for_day(date_value):
        return {
            "health": HealthLog.objects.filter(date=date_value).first(),
            "mood": MoodLog.objects.filter(date=date_value).first(),
            "spiritual": SpiritualLog.objects.filter(date=date_value).first(),
            "habit_logs": list(HabitLog.objects.filter(date=date_value, done=True).select_related("habit")),
            "finance_entries": list(FinanceEntry.objects.filter(date=date_value)),
            "marketing": list(MarketingAction.objects.filter(date=date_value)),
            "achievements": list(Achievement.objects.filter(date=date_value)),
            "decisions": list(DecisionLog.objects.filter(date=date_value)),
        }

    @staticmethod
    def _score(detail):
        score = 0
        health = detail["health"]
        mood = detail["mood"]
        spiritual = detail["spiritual"]
        if health:
            score += 20
            if health.energy_level >= 4:
                score += 10
            if health.sleep_hours >= 7:
                score += 10
        if mood:
            score += mood.mood_score * 4
        if spiritual:
            score += spiritual.prayers_count * 4
        if detail["habit_logs"]:
            score += min(20, len(detail["habit_logs"]) * 5)
        if detail["marketing"]:
            score += 5
        if detail["achievements"]:
            score += 10
        return min(100, score)

    @staticmethod
    def _top_priority_titles():
        return list(
            Node.objects.filter(
                status__in=[Node.Status.ACTIVE, Node.Status.AVAILABLE],
                type__in=[Node.NodeType.GOAL, Node.NodeType.PROJECT, Node.NodeType.TASK],
            )
            .order_by("created_at")
            .values_list("title", flat=True)[:3]
        )

    @staticmethod
    def _detail_rows(detail):
        rows = []
        if detail["health"]:
            rows.append({
                "domain": "Health",
                "label": "Body",
                "value": f"Sleep {detail['health'].sleep_hours}h - Energy {detail['health'].energy_level}/5",
            })
        if detail["mood"]:
            mood_value = f"{detail['mood'].mood_score}/5"
            if detail["mood"].notes:
                mood_value += f" - {detail['mood'].notes}"
            rows.append({
                "domain": "Mood",
                "label": "Mood",
                "value": mood_value,
            })
        if detail["spiritual"]:
            rows.append({
                "domain": "Spiritual",
                "label": "Prayers",
                "value": f"{detail['spiritual'].prayers_count}/5 prayers - Quran {detail['spiritual'].quran_pages}",
            })
        if detail["habit_logs"]:
            rows.append({
                "domain": "Habits",
                "label": "Habits",
                "value": ", ".join(log.habit.name for log in detail["habit_logs"]),
            })
        if detail["finance_entries"]:
            rows.append({
                "domain": "Finance",
                "label": "Money",
                "value": " - ".join(
                    f"{'+' if entry.type == FinanceEntry.EntryType.INCOME else '-'}{entry.amount} {entry.currency}"
                    for entry in detail["finance_entries"]
                ),
            })
        if detail["marketing"]:
            rows.append({
                "domain": "Marketing",
                "label": "Visibility",
                "value": " - ".join(item.action for item in detail["marketing"]),
            })
        if detail["achievements"]:
            rows.append({
                "domain": "Achievement",
                "label": "Wins",
                "value": " - ".join(item.title for item in detail["achievements"]),
            })
        if detail["decisions"]:
            rows.append({
                "domain": "Decision",
                "label": "Decisions",
                "value": " - ".join(item.decision for item in detail["decisions"]),
            })
        return rows

    @classmethod
    def _ai_context_for_day(cls, *, date_value, detail, today_value, top_priorities, reduced_mode):
        return {
            "date": date_value.isoformat(),
            "is_future": date_value > today_value,
            "context": {
                "health": (
                    {
                        "sleep_hours": float(detail["health"].sleep_hours),
                        "energy_level": detail["health"].energy_level,
                    } if detail["health"] else None
                ),
                "mood": (
                    {
                        "mood_score": detail["mood"].mood_score,
                    } if detail["mood"] else None
                ),
                "prayers_count": detail["spiritual"].prayers_count if detail["spiritual"] else None,
                "habit_count": len(detail["habit_logs"]),
                "marketing_count": len(detail["marketing"]),
                "achievement_count": len(detail["achievements"]),
                "detail_rows": cls._detail_rows(detail),
                "reduced_mode": reduced_mode,
                "due_follow_ups_count": MarketingAction.objects.filter(
                    follow_up_done=False,
                    follow_up_date__lte=date_value,
                ).count(),
                "top_priorities": top_priorities,
            },
        }

    @classmethod
    def _serialize_day(cls, *, date_value, today_value, detail, ai_note):
        detail_rows = cls._detail_rows(detail)
        return {
            "date": date_value.isoformat(),
            "is_today": date_value == today_value,
            "is_future": date_value > today_value,
            "score": cls._score(detail),
            "indicators": {
                "health": bool(detail["health"]),
                "mood": bool(detail["mood"]),
                "spiritual": bool(detail["spiritual"]),
                "habits": bool(detail["habit_logs"]),
                "finance": bool(detail["finance_entries"]),
                "marketing": bool(detail["marketing"]),
                "achievements": bool(detail["achievements"]),
                "decisions": bool(detail["decisions"]),
            },
            "detail_rows": detail_rows,
            "ai_note": ai_note,
        }

    @classmethod
    def payload(cls, week_start=None):
        """Return the current timeline week payload."""
        today_value = timezone.localdate()
        week_start = week_start or cls._week_start(today_value)
        days = [week_start + timedelta(days=index) for index in range(7)]
        top_priorities = cls._top_priority_titles()
        reduced_mode = OverwhelmService.summary(today_value)["reduced_mode"]
        detail_by_date = {day.isoformat(): cls._detail_for_day(day) for day in days}
        ai_day_inputs = [
            cls._ai_context_for_day(
                date_value=day,
                detail=detail_by_date[day.isoformat()],
                today_value=today_value,
                top_priorities=top_priorities,
                reduced_mode=reduced_mode,
            )
            for day in days
        ]
        ai_notes = get_ai_provider().summarize_timeline_week(
            week_start=week_start.isoformat(),
            week_end=days[-1].isoformat(),
            today=today_value.isoformat(),
            days=ai_day_inputs,
            top_priorities=top_priorities,
        )
        note_by_date = {item["date"]: item["ai_note"] for item in ai_notes}

        return {
            "today": today_value.isoformat(),
            "week_start": week_start.isoformat(),
            "week_end": days[-1].isoformat(),
            "days": [
                cls._serialize_day(
                    date_value=day,
                    today_value=today_value,
                    detail=detail_by_date[day.isoformat()],
                    ai_note=note_by_date.get(day.isoformat(), ""),
                )
                for day in days
            ],
        }


class TimelineOverviewService:
    """Build the grouped achievements and timeline workspace payload."""

    @staticmethod
    def _serialize_retrospective(item):
        return {
            "id": str(item.id),
            "title": item.title,
            "source_type": item.source_type,
            "status": item.status,
            "summary": item.summary,
            "what_worked": item.what_worked,
            "what_didnt": item.what_didnt,
            "next_time": item.next_time,
            "closed_at": item.closed_at.isoformat(),
        }

    @classmethod
    def payload(cls, reference_date=None):
        reference_date = reference_date or timezone.localdate()
        preview = WeeklyReviewService.preview(reference_date)
        analytics_overview = AnalyticsOverviewService.payload(reference_date)
        achievements = list(Achievement.objects.order_by("-date", "-created_at")[:8])
        retrospectives = list(ProjectRetrospective.objects.order_by("-closed_at", "-created_at")[:8])
        archived_goals = list(
            Node.objects.filter(
                type__in=[Node.NodeType.GOAL, Node.NodeType.PROJECT],
                status=Node.Status.DONE,
            ).order_by("-completed_at", "-updated_at")[:8],
        )
        return {
            "date": reference_date.isoformat(),
            "timeline": TimelineService.payload(),
            "weekly_review": {
                "status": WeeklyReviewService.status(reference_date),
                "preview": WeeklyReviewService.serialize_preview(preview),
            },
            "pattern_analysis": analytics_overview["pattern_analysis"],
            "achievements": [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "domain": item.domain,
                    "date": item.date.isoformat(),
                    "notes": item.notes,
                }
                for item in achievements
            ],
            "retrospectives": [cls._serialize_retrospective(item) for item in retrospectives],
            "archived_goals": [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "type": item.type,
                    "category": item.category,
                    "completed_at": item.completed_at.isoformat() if item.completed_at else None,
                    "notes": item.notes,
                }
                for item in archived_goals
            ],
        }


class IdeasOverviewService:
    """Build the grouped ideas and thinking workspace payload."""

    @classmethod
    def payload(cls, reference_date=None):
        reference_date = reference_date or timezone.localdate()
        ideas = list(Idea.objects.order_by("-created_at")[:12])
        decisions = list(DecisionLog.objects.order_by("-date", "-created_at")[:12])
        learnings = list(Learning.objects.order_by("-created_at")[:12])
        return {
            "date": reference_date.isoformat(),
            "summary": {
                "raw_ideas": Idea.objects.filter(status=Idea.Status.RAW).count(),
                "validated_ideas": Idea.objects.filter(status=Idea.Status.VALIDATED).count(),
                "decisions": DecisionLog.objects.count(),
                "learning_items": Learning.objects.count(),
            },
            "ideas": [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "context": item.context,
                    "status": item.status,
                    "linked_goal": str(item.linked_goal_id) if item.linked_goal_id else None,
                    "created_at": item.created_at.isoformat(),
                }
                for item in ideas
            ],
            "decisions": [
                {
                    "id": str(item.id),
                    "decision": item.decision,
                    "reasoning": item.reasoning,
                    "alternatives_considered": item.alternatives_considered,
                    "outcome": item.outcome,
                    "date": item.date.isoformat(),
                    "created_at": item.created_at.isoformat(),
                }
                for item in decisions
            ],
            "learning": [
                {
                    "id": str(item.id),
                    "topic": item.topic,
                    "source": item.source,
                    "status": item.status,
                    "key_insights": item.key_insights,
                    "linked_goal": str(item.linked_goal_id) if item.linked_goal_id else None,
                    "created_at": item.created_at.isoformat(),
                }
                for item in learnings
            ],
        }
