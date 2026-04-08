"""Weekly review assembly and preview generation."""
import datetime
from datetime import timedelta

from django.utils import timezone

from analytics.models.weekly_review import WeeklyReview
from core.ai import get_ai_provider
from finance.services import FinanceMetricsService
from goals.models import Node
from health.services import HealthSummaryService
from pipeline.services import OpportunityLifecycleService
from schedule.services import ScheduleReviewService

from analytics.services.overwhelm import OverwhelmService


def _routine_week_summary(week_start, week_end):
    """Aggregate RoutineLog data for the review window."""
    try:
        from schedule.models import RoutineLog, RoutineBlock  # noqa: PLC0415

        logs = RoutineLog.objects.filter(date__range=(week_start, week_end))
        total = logs.count()
        done = logs.filter(status__in=["done", "partial"]).count()
        skipped = logs.filter(status="skipped").count()
        completion_pct = round(100 * done / total) if total > 0 else 0

        # Find the most-skipped blocks
        from django.db.models import Count  # noqa: PLC0415
        top_skips = (
            logs.filter(status="skipped")
            .values("block_time")
            .annotate(n=Count("id"))
            .order_by("-n")[:3]
        )
        skip_labels = []
        for s in top_skips:
            block = RoutineBlock.objects.filter(time=s["block_time"]).first()
            label = block.title if block else str(s["block_time"])
            skip_labels.append(f"{label} ({s['n']}x skipped)")

        return {
            "total_logged": total,
            "done_count": done,
            "skipped_count": skipped,
            "completion_pct": completion_pct,
            "top_skipped_blocks": skip_labels,
        }
    except Exception:  # noqa: BLE001
        return {}


def _journal_week_summary(week_start, week_end):
    """Collect journal entries from the review window."""
    try:
        from journal.models import JournalEntry  # noqa: PLC0415

        entries = JournalEntry.objects.filter(date__range=(week_start, week_end)).order_by("date")
        if not entries.exists():
            return {}
        return {
            "entry_count": entries.count(),
            "tomorrow_focuses": [e.tomorrow_focus for e in entries if e.tomorrow_focus],
            "wins": [e.wins for e in entries if e.wins],
        }
    except Exception:  # noqa: BLE001
        return {}


class WeeklyReviewService:
    """Builds the weekly review preview payload."""

    @classmethod
    def week_bounds(cls, reference_date=None):
        """Return the Monday-Sunday range for the given date."""
        reference_date = reference_date or timezone.localdate()
        week_start = reference_date - timedelta(days=reference_date.weekday())
        week_end = week_start + timedelta(days=6)
        return week_start, week_end

    @classmethod
    def preview(cls, reference_date=None):
        """Assemble the cross-domain weekly review without persisting it."""
        reference_date = reference_date or timezone.localdate()
        week_start, week_end = cls.week_bounds(reference_date)
        finance = FinanceMetricsService.summary(reference_date)
        health = HealthSummaryService.summary(reference_date)
        pipeline = OpportunityLifecycleService.summary()
        goals = {
            "done_count": Node.objects.filter(status=Node.Status.DONE).count(),
            "available_count": Node.objects.filter(status=Node.Status.AVAILABLE).count(),
            "blocked_count": Node.objects.filter(status=Node.Status.BLOCKED).count(),
        }
        routine = _routine_week_summary(week_start, week_end)
        journal = _journal_week_summary(week_start, week_end)
        context = {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "finance": finance,
            "health": health,
            "pipeline": pipeline,
            "goals": goals,
            "schedule": ScheduleReviewService.weekly_summary(reference_date),
            "routine": routine,
            "journal": journal,
            "overwhelm": OverwhelmService.summary(reference_date),
        }
        report = get_ai_provider().generate_weekly_review(context=context)
        return {
            "week_start": week_start,
            "week_end": week_end,
            "report": report,
            "context": context,
        }

    @classmethod
    def serialize_preview(cls, preview_payload):
        """Normalize preview payload for API responses."""
        return {
            "week_start": preview_payload["week_start"].isoformat(),
            "week_end": preview_payload["week_end"].isoformat(),
            "report": preview_payload["report"],
            "context": preview_payload["context"],
        }

    @classmethod
    def generate(cls, reference_date=None):
        """Persist the current weekly review while preserving personal notes."""
        preview_payload = cls.preview(reference_date=reference_date)
        review, created = WeeklyReview.objects.update_or_create(
            week_start=preview_payload["week_start"],
            week_end=preview_payload["week_end"],
            defaults={
                "ai_report": preview_payload["report"],
            },
        )
        return {
            "review": review,
            "preview": cls.serialize_preview(preview_payload),
            "created": created,
        }

    @classmethod
    def status(cls, reference_date=None):
        """Return current-week and latest-review metadata for the dashboard."""
        reference_date = reference_date or timezone.localdate()
        week_start, week_end = cls.week_bounds(reference_date)
        current_review = WeeklyReview.objects.filter(
            week_start=week_start,
            week_end=week_end,
        ).first()
        latest_review = WeeklyReview.objects.order_by("-week_start", "-created_at").first()
        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "review_exists": current_review is not None,
            "current_review_id": str(current_review.id) if current_review else None,
            "latest_review_id": str(latest_review.id) if latest_review else None,
        }
