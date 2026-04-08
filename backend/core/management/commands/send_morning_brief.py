"""Management command: send_morning_brief

Sends a Telegram morning briefing with today's routine blocks and due tasks.

Usage:
    python manage.py send_morning_brief
    python manage.py send_morning_brief --dry-run
"""
import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Send the morning briefing via Telegram."

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
            self.stdout.write(self.style.SUCCESS("Morning brief sent via Telegram."))
        else:
            self.stderr.write("Failed to send Telegram message. Check logs.")

    def _build_message(self):
        today = timezone.localdate()
        lines = [f"<b>Good morning! {today.strftime('%A, %d %B')}</b>", ""]

        # Today's routine blocks
        try:
            from schedule.models import RoutineBlock, RoutineLog  # noqa: PLC0415

            blocks = RoutineBlock.objects.filter(active=True).order_by("time")[:15]
            if blocks.exists():
                lines.append("<b>Today's routine</b>")
                logged_times = set(
                    RoutineLog.objects.filter(date=today).values_list("block_time", flat=True)
                )
                for block in blocks:
                    time_str = block.time.strftime("%H:%M") if block.time else "?"
                    logged = block.time in logged_times if block.time else False
                    icon = "✅" if logged else "⏰"
                    lines.append(f"{icon} {time_str} — {block.title}")
                lines.append("")
        except Exception:  # noqa: BLE001
            pass

        # Yesterday's routine score
        try:
            from schedule.models import RoutineLog  # noqa: PLC0415
            yesterday = today - datetime.timedelta(days=1)
            logs = RoutineLog.objects.filter(date=yesterday)
            total = logs.count()
            done = logs.filter(status__in=["done", "partial"]).count()
            if total > 0:
                pct = round(100 * done / total)
                lines.append(f"<b>Yesterday's score:</b> {done}/{total} blocks ({pct}%)")
                lines.append("")
        except Exception:  # noqa: BLE001
            pass

        # Due tasks from goals
        try:
            from goals.models import Node  # noqa: PLC0415
            due_tasks = Node.objects.filter(
                due_date__lte=today,
                status__in=["active", "available", "blocked"],
            ).order_by("due_date")[:5]
            if due_tasks.exists():
                lines.append("<b>Tasks due today or overdue</b>")
                for task in due_tasks:
                    days_diff = (today - task.due_date).days
                    overdue_str = f" ({days_diff}d overdue)" if days_diff > 0 else " (due today)"
                    lines.append(f"• {task.title}{overdue_str}")
                lines.append("")
        except Exception:  # noqa: BLE001
            pass

        lines.append("Have a focused, intentional day!")
        return "\n".join(lines)
