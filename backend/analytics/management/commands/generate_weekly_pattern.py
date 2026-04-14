"""Management command: generate_weekly_pattern

Runs weekly (Sunday evening). Reads 7-day cross-domain data, calls
AI.analyze_patterns(), saves the result as an AISuggestion, and sends
a Telegram summary.

Usage:
    python manage.py generate_weekly_pattern
    python manage.py generate_weekly_pattern --dry-run
"""
import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone


def _gather_overview(today):
    """Assemble 7-day cross-domain overview matching analyze_patterns() schema."""
    overview = {"date": today.isoformat()}

    # Health (7-day averages)
    try:
        from health.services import HealthSummaryService  # noqa: PLC0415
        summary = HealthSummaryService.summary(today)
        overview["health"] = {
            "avg_sleep_7d": summary.get("avg_sleep_7d"),
            "avg_mood_7d": summary.get("avg_mood_7d"),
            "habit_completion_rate_7d": summary.get("habit_completion_rate_7d"),
            "prayer_completion_rate_7d": summary.get("prayer_completion_rate_7d"),
            "low_sleep_today": summary.get("low_sleep_today", False),
            "low_energy_today": summary.get("low_energy_today", False),
            "low_mood_today": summary.get("low_mood_today", False),
            "low_mood_streak": summary.get("low_mood_streak", 0),
        }
    except Exception:  # noqa: BLE001
        overview["health"] = {
            "avg_sleep_7d": None,
            "avg_mood_7d": None,
            "habit_completion_rate_7d": None,
            "prayer_completion_rate_7d": None,
            "low_sleep_today": False,
            "low_energy_today": False,
            "low_mood_today": False,
            "low_mood_streak": 0,
        }

    # Finance
    try:
        from finance.services import FinanceSummaryService  # noqa: PLC0415
        fin = FinanceSummaryService.summary()
        overview["finance"] = {
            "independent_income_eur": fin.get("independent_income_eur", 0),
            "net_eur": fin.get("net_eur", 0),
            "kyrgyzstan_progress_pct": fin.get("kyrgyzstan_progress_pct", 0),
        }
    except Exception:  # noqa: BLE001
        overview["finance"] = {
            "independent_income_eur": 0,
            "net_eur": 0,
            "kyrgyzstan_progress_pct": 0,
        }

    # Pipeline
    try:
        from pipeline.services import OpportunityLifecycleService  # noqa: PLC0415
        pipeline = OpportunityLifecycleService.summary()
        overview["pipeline"] = {
            "active_count": pipeline.get("active_count", 0),
            "due_follow_ups_count": pipeline.get("due_follow_ups_count", 0),
            "empty_pipeline": pipeline.get("empty_pipeline", False),
        }
    except Exception:  # noqa: BLE001
        overview["pipeline"] = {
            "active_count": 0,
            "due_follow_ups_count": 0,
            "empty_pipeline": True,
        }

    # History rows (empty list OK — live prompt accepts it; deterministic fallback ignores it)
    overview["history"] = []

    # Counts (required by analyze_patterns deterministic fallback)
    try:
        from analytics.models import Achievement  # noqa: PLC0415
        from pipeline.models import MarketingAction  # noqa: PLC0415
        seven_days_ago = today - datetime.timedelta(days=7)
        overview["counts"] = {
            "achievements": Achievement.objects.count(),
            "marketing_actions": MarketingAction.objects.filter(
                date__gte=seven_days_ago
            ).count(),
        }
    except Exception:  # noqa: BLE001
        overview["counts"] = {"achievements": 0, "marketing_actions": 0}

    return overview


class Command(BaseCommand):
    help = "Generate weekly AI pattern analysis and send to Telegram."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Print the pattern analysis without saving or sending.",
        )

    def handle(self, *args, **options):
        today = timezone.localdate()
        dry_run = options["dry_run"]

        self.stdout.write("Gathering 7-day cross-domain overview...")
        overview = _gather_overview(today)

        self.stdout.write("Calling AI provider for pattern analysis...")
        try:
            from core.ai import get_ai_provider  # noqa: PLC0415
            provider = get_ai_provider()
            pattern_text = provider.analyze_patterns(overview=overview)
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f"AI provider error: {exc}")
            return

        if not pattern_text:
            self.stdout.write("AI returned no pattern text.")
            return

        if dry_run:
            self.stdout.write("--- DRY RUN (not saved, not sent) ---")
            self.stdout.write(pattern_text)
            return

        # Save as AISuggestion
        try:
            from analytics.services import AISuggestionService  # noqa: PLC0415
            AISuggestionService.create_or_reuse(
                topic="weekly_pattern",
                module="analytics",
                suggestion_text=pattern_text,
            )
            self.stdout.write("Pattern saved to AISuggestion.")
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f"Failed to save suggestion: {exc}")

        # Send to Telegram
        try:
            from core.telegram import is_configured, send_message  # noqa: PLC0415
            if is_configured():
                week_label = today.strftime("Week of %d %b %Y")
                msg = f"<b>📊 Weekly Pattern — {week_label}</b>\n\n{pattern_text}"
                if send_message(msg):
                    self.stdout.write("Telegram summary sent.")
                else:
                    self.stdout.write("Telegram send failed (check logs).")
        except Exception as exc:  # noqa: BLE001
            self.stderr.write(f"Telegram error: {exc}")

        self.stdout.write(self.style.SUCCESS("Weekly pattern analysis complete."))
