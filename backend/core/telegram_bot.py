"""Telegram bot command handlers for Personal OS.

Incoming messages from Mohamed are dispatched here via the webhook view.
Only messages from TELEGRAM_CHAT_ID are processed — all others are ignored silently.

Commands:
  /brief   — Morning brief (routine plan + top priorities)
  /next    — AI-powered next action recommendation
  /capture — Save an idea: /capture <text>
  /status  — Today's completion stats + node counts
  /help    — List commands
"""
import logging
import os

logger = logging.getLogger(__name__)


def _allowed_chat(chat_id: str) -> bool:
    """Return True only if this chat is Mohamed's configured chat."""
    allowed = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    return bool(allowed and str(chat_id) == allowed)


def handle_webhook(update: dict) -> None:
    """Parse a Telegram update dict and dispatch to the appropriate handler.

    Called from TelegramWebhookView.post(). Any exception is caught so the
    webhook always returns 200 OK to Telegram (prevents retry storms).
    """
    try:
        message = update.get("message") or update.get("edited_message") or {}
        chat_id = str(message.get("chat", {}).get("id", ""))
        text = (message.get("text") or "").strip()

        if not chat_id or not text:
            return

        if not _allowed_chat(chat_id):
            logger.debug("Telegram message from unknown chat %s — ignored.", chat_id)
            return

        if text.startswith("/brief"):
            _handle_brief()
        elif text.startswith("/next"):
            _handle_next()
        elif text.lower().startswith("/capture"):
            idea_text = text[len("/capture"):].strip()
            _handle_capture(idea_text)
        elif text.startswith("/status"):
            _handle_status()
        else:
            _handle_help()

    except Exception:  # noqa: BLE001
        logger.exception("Unhandled error in Telegram webhook handler.")


# ── Command handlers ───────────────────────────────────────────────────────────

def _handle_brief() -> None:
    """Send the morning brief: routine plan + top 3 priority nodes + due follow-ups."""
    from core.management.commands.send_morning_brief import Command  # noqa: PLC0415
    from core.telegram import send_message  # noqa: PLC0415

    try:
        message = Command()._build_message()
        # Append top priorities
        priority_section = _build_priorities_text()
        if priority_section:
            message += "\n\n" + priority_section
        send_message(message)
    except Exception as exc:  # noqa: BLE001
        logger.exception("_handle_brief failed.")
        send_message(f"⚠ Could not build brief: {exc}")


def _handle_next() -> None:
    """Send the single most important action to take right now — via real AI."""
    from django.utils import timezone  # noqa: PLC0415

    from core.ai import get_ai_provider  # noqa: PLC0415
    from core.ai_prompts import build_rich_profile_context  # noqa: PLC0415
    from core.telegram import send_message  # noqa: PLC0415
    from goals.models import Node  # noqa: PLC0415
    from pipeline.models import MarketingAction  # noqa: PLC0415
    from schedule.models import RoutineLog  # noqa: PLC0415

    try:
        today = timezone.localdate()
        EFFORT_WEIGHT = {"15min": 1, "30min": 1, "1h": 1, "2h": 2, "4h": 2, "1day": 3, "2days": 3, "1week": 4, "ongoing": 2}
        qs = Node.objects.exclude(status__in=["done", "deferred"]).prefetch_related("deps", "dependents")
        nodes_ranked = []
        for node in qs:
            dep_count = node.dependents.count()
            priority_val = node.priority or 3
            effort_w = EFFORT_WEIGHT.get(node.effort or "", 2)
            score = dep_count * 3 + (5 - priority_val) * 2 + (2 if node.status == "active" else 1) - effort_w
            nodes_ranked.append({"id": str(node.id), "title": node.title, "type": node.type, "status": node.status, "dependent_count": dep_count, "leverage_score": score})
        nodes_ranked.sort(key=lambda x: x["leverage_score"], reverse=True)

        today_logs = RoutineLog.objects.filter(date=today)
        done_logs = today_logs.filter(status__in=["done", "partial"]).count()
        total_logs = today_logs.count()
        routine_pct = round((done_logs / total_logs) * 100) if total_logs > 0 else 0

        due_follow_ups_count = MarketingAction.objects.filter(follow_up_date__lte=today, result="").count()

        profile_context = build_rich_profile_context()

        provider = get_ai_provider()
        result = provider.suggest_next_action(
            top_nodes=nodes_ranked[:5],
            routine_pct=routine_pct,
            due_follow_ups_count=due_follow_ups_count,
            profile_context=profile_context,
        )
        msg = f"⚡ <b>Do this now:</b>\n{result['action']}\n\n<i>{result['reason']}</i>"
        send_message(msg)
    except Exception as exc:  # noqa: BLE001
        logger.exception("_handle_next failed.")
        send_message(f"⚠ Could not compute next action: {exc}")


def _handle_capture(text: str) -> None:
    """Save a raw idea and confirm."""
    from core.telegram import send_message  # noqa: PLC0415

    if not text:
        send_message("Usage: /capture &lt;your idea text&gt;\n\nExample: /capture Build a pricing page for the Clarity Audit")
        return

    try:
        from analytics.models.idea import Idea  # noqa: PLC0415
        idea = Idea.objects.create(title=text[:255], status="raw")
        send_message(f'💡 <b>Idea captured:</b>\n"{idea.title}"\n\nStatus: raw — review it at /ideas')
    except Exception as exc:  # noqa: BLE001
        logger.exception("_handle_capture failed.")
        send_message(f"⚠ Could not save idea: {exc}")


def _handle_status() -> None:
    """Send today's completion stats and node counts."""
    from django.utils import timezone  # noqa: PLC0415

    from core.telegram import send_message  # noqa: PLC0415
    from goals.models import Node  # noqa: PLC0415
    from schedule.models import RoutineLog  # noqa: PLC0415

    try:
        today = timezone.localdate()
        logs = RoutineLog.objects.filter(date=today)
        total = logs.count()
        done = logs.filter(status__in=["done", "partial"]).count()
        pct = round(100 * done / total) if total > 0 else 0

        active = Node.objects.filter(status="active").count()
        available = Node.objects.filter(status="available").count()
        blocked = Node.objects.filter(status="blocked").count()

        lines = [
            f"📊 <b>Status — {today.strftime('%A %d %b')}</b>",
            "",
            f"▦ Routine: {done}/{total} blocks ({pct}%)",
            "",
            "<b>Goals</b>",
            f"• Active: {active}",
            f"• Available: {available}",
            f"• Blocked: {blocked}",
        ]
        send_message("\n".join(lines))
    except Exception as exc:  # noqa: BLE001
        logger.exception("_handle_status failed.")
        send_message(f"⚠ Could not load status: {exc}")


def _handle_help() -> None:
    from core.telegram import send_message  # noqa: PLC0415
    send_message(
        "<b>Personal OS Bot</b>\n\n"
        "/brief — Morning brief (routine + priorities)\n"
        "/next — What to do right now\n"
        "/capture &lt;text&gt; — Save a raw idea\n"
        "/status — Today's completion stats\n"
        "/help — Show this message"
    )


def _build_priorities_text() -> str:
    """Build a short top-3 priorities section for the brief."""
    try:
        from goals.models import Node  # noqa: PLC0415
        EFFORT_WEIGHT = {"15min": 1, "30min": 1, "1h": 1, "2h": 2, "4h": 2, "1day": 3, "2days": 3, "1week": 4, "ongoing": 2}
        qs = Node.objects.exclude(status__in=["done", "deferred"]).prefetch_related("deps", "dependents")
        scored = []
        for node in qs:
            dep_count = node.dependents.count()
            priority_val = node.priority or 3
            effort_w = EFFORT_WEIGHT.get(node.effort or "", 2)
            score = dep_count * 3 + (5 - priority_val) * 2 + (2 if node.status == "active" else 1) - effort_w
            scored.append((score, node.title, node.status))
        scored.sort(reverse=True)
        top3 = scored[:3]
        if not top3:
            return ""
        lines = ["<b>Top priorities today</b>"]
        for _, title, status in top3:
            icon = "🔥" if status == "active" else "◻"
            lines.append(f"{icon} {title}")
        return "\n".join(lines)
    except Exception:  # noqa: BLE001
        return ""
