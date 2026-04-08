"""Management command: generate_suggestions

Reads 30 days of cross-domain data, calls the AI provider, and upserts
3–5 specific suggestions into the AISuggestion table.

Usage:
    python manage.py generate_suggestions
    python manage.py generate_suggestions --dry-run
"""
import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone


def _gather_context(today):
    """Assemble 30-day context across all domains."""
    ctx = {"date": today.isoformat()}
    thirty_days_ago = today - datetime.timedelta(days=30)
    seven_days_ago = today - datetime.timedelta(days=7)

    # Health (7-day averages)
    try:
        from health.services import HealthSummaryService  # noqa: PLC0415
        summary = HealthSummaryService.summary(today)
        ctx["health"] = {
            "avg_sleep_7d": summary["avg_sleep_7d"],
            "avg_energy_7d": summary["avg_energy_7d"],
            "avg_mood_7d": summary["avg_mood_7d"],
            "habit_completion_rate_7d": summary["habit_completion_rate_7d"],
            "prayer_completion_rate_7d": summary["prayer_completion_rate_7d"],
            "low_sleep_today": summary["low_sleep_today"],
            "low_energy_today": summary["low_energy_today"],
        }
    except Exception:  # noqa: BLE001
        ctx["health"] = {}

    # Finance
    try:
        from finance.services import FinanceSummaryService  # noqa: PLC0415
        fin = FinanceSummaryService.summary()
        ctx["finance"] = {
            "independent_income_eur": fin["independent_income_eur"],
            "net_eur": fin["net_eur"],
            "kyrgyzstan_progress_pct": fin["kyrgyzstan_progress_pct"],
        }
    except Exception:  # noqa: BLE001
        ctx["finance"] = {}

    # Pipeline
    try:
        from pipeline.services import OpportunityLifecycleService  # noqa: PLC0415
        pipeline = OpportunityLifecycleService.summary()
        ctx["pipeline"] = {
            "active_count": pipeline.get("active_count", 0),
            "due_follow_ups_count": pipeline.get("due_follow_ups_count", 0),
            "empty_pipeline": pipeline.get("empty_pipeline", False),
        }
    except Exception:  # noqa: BLE001
        ctx["pipeline"] = {}

    # Routine (30-day)
    try:
        from schedule.models import RoutineLog  # noqa: PLC0415
        logs_30d = RoutineLog.objects.filter(date__range=(thirty_days_ago, today))
        total = logs_30d.count()
        done = logs_30d.filter(status__in=["done", "partial"]).count()
        ctx["routine"] = {
            "completion_pct_30d": round(100 * done / total) if total > 0 else None,
            "total_logged_30d": total,
        }
    except Exception:  # noqa: BLE001
        ctx["routine"] = {}

    # Goals (stalled / overdue)
    try:
        from goals.models import Node  # noqa: PLC0415
        stalled = Node.objects.filter(
            status__in=["active", "available"],
            updated_at__lt=timezone.now() - datetime.timedelta(days=14),
        ).count()
        overdue = Node.objects.filter(
            due_date__lt=today,
            status__in=["active", "available", "blocked"],
        ).count()
        ctx["goals"] = {
            "stalled_nodes": stalled,
            "overdue_nodes": overdue,
            "active_count": Node.objects.filter(status="active").count(),
        }
    except Exception:  # noqa: BLE001
        ctx["goals"] = {}

    return ctx


class Command(BaseCommand):
    help = "Generate AI-driven suggestions from 30-day cross-domain context."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Print suggestions without saving them.",
        )

    def handle(self, *args, **options):
        today = timezone.localdate()
        dry_run = options["dry_run"]

        self.stdout.write("Gathering 30-day context...")
        ctx = _gather_context(today)

        self.stdout.write("Calling AI provider...")
        try:
            from core.ai import get_ai_provider  # noqa: PLC0415
            provider = get_ai_provider()
            suggestions = provider.generate_live_suggestions(context=ctx)
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f"AI provider error: {exc}")
            return

        if not suggestions:
            self.stdout.write("AI returned no suggestions.")
            return

        if dry_run:
            self.stdout.write("--- DRY RUN (suggestions not saved) ---")
            for s in suggestions:
                self.stdout.write(f"[{s['module']}] {s['topic']}: {s['text']}")
            return

        from analytics.services import AISuggestionService  # noqa: PLC0415
        created_count = 0
        for s in suggestions:
            topic = s.get("topic", "ai_insight")
            module = s.get("module", "analytics")
            text = s.get("text", "")
            if not text:
                continue
            suggestion, was_created = AISuggestionService.create_or_reuse(
                topic=topic,
                module=module,
                suggestion_text=text,
            )
            if was_created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Done. {created_count}/{len(suggestions)} new suggestions saved.")
        )
