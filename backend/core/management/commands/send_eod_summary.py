"""Management command: send_eod_summary

Sends an end-of-day Telegram summary: routine completion % and skipped blocks.

Usage:
    python manage.py send_eod_summary
    python manage.py send_eod_summary --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Send the end-of-day summary via Telegram."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Print the message without sending it.",
        )

    def handle(self, *args, **options):
        message = self._build_message()

        if options["dry_run"]:
            self.stdout.write("--- DRY RUN (message not sent) ---")
            self.stdout.write(message)
            return

        from core.telegram import is_configured, send_message  # noqa: PLC0415

        if not is_configured():
            self.stderr.write(
                "Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID."
            )
            return

        success = send_message(message)
        if success:
            self.stdout.write(self.style.SUCCESS("EOD summary sent via Telegram."))
        else:
            self.stderr.write("Failed to send Telegram message. Check logs.")

    def _build_message(self):
        today = timezone.localdate()
        lines = [f"<b>End of day — {today.strftime('%A, %d %B')}</b>", ""]

        try:
            from schedule.models import RoutineLog  # noqa: PLC0415

            logs = RoutineLog.objects.filter(date=today)
            total = logs.count()
            done = logs.filter(status__in=["done", "partial"]).count()
            skipped_logs = logs.filter(status="skipped")

            if total > 0:
                pct = round(100 * done / total)
                emoji = "🌟" if pct >= 80 else "✅" if pct >= 60 else "⚠️"
                lines.append(f"{emoji} <b>Today's score: {done}/{total} ({pct}%)</b>")
            else:
                lines.append("No routine blocks logged today.")

            if skipped_logs.exists():
                lines.append("")
                lines.append("<b>Skipped blocks:</b>")
                for log in skipped_logs[:8]:
                    time_str = log.block_time.strftime("%H:%M") if log.block_time else "?"
                    lines.append(f"  ✗ {time_str}")
        except Exception:  # noqa: BLE001
            lines.append("Could not retrieve routine data.")

        lines.append("")
        lines.append("Rest well. Tomorrow you go again.")
        return "\n".join(lines)
