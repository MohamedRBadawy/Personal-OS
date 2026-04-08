"""Telegram notification helper for Personal OS.

Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from environment.
All functions are no-ops if the env vars are not set.

Usage:
    from core.telegram import send_message
    send_message("Hello from Personal OS!")
"""
import logging
import os
import urllib.request
import urllib.parse
import json

logger = logging.getLogger(__name__)


def _get_config():
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    return token, chat_id


def is_configured() -> bool:
    """Return True if Telegram credentials are present."""
    token, chat_id = _get_config()
    return bool(token and chat_id)


def send_message(text: str, parse_mode: str = "HTML") -> bool:
    """Send a Telegram message. Returns True on success, False otherwise.

    Silently skips if credentials are not configured.
    """
    token, chat_id = _get_config()
    if not token or not chat_id:
        logger.debug("Telegram not configured — skipping send_message.")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            if result.get("ok"):
                logger.info("Telegram message sent successfully.")
                return True
            else:
                logger.warning("Telegram API error: %s", result)
                return False
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to send Telegram message: %s", exc)
        return False
