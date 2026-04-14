"""Gmail thread service — fetch recent email threads for a contact by email address.

Uses the same Google OAuth2 refresh-token credentials as gcal_service.py.
Requires the GOOGLE_REFRESH_TOKEN to have been generated with the
'https://www.googleapis.com/auth/gmail.readonly' scope included.

If credentials are not configured or the API call fails, returns [] gracefully.
"""
from __future__ import annotations

import os

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
]


def _build_gmail_service():
    """Build an authenticated Gmail API service from env vars.

    Returns None if credentials are not configured.
    """
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN", "")

    if not all([client_id, client_secret, refresh_token]):
        return None

    try:
        from google.oauth2.credentials import Credentials  # noqa: PLC0415
        from googleapiclient.discovery import build  # noqa: PLC0415

        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            client_id=client_id,
            client_secret=client_secret,
            token_uri="https://oauth2.googleapis.com/token",
            scopes=GMAIL_SCOPES,
        )
        return build("gmail", "v1", credentials=creds, cache_discovery=False)
    except Exception:  # noqa: BLE001
        return None


def get_gmail_threads(email: str, max_results: int = 5) -> list[dict]:
    """Return up to max_results recent Gmail threads involving the given email.

    Each returned dict has:
        id            — Gmail thread ID
        subject       — Thread subject line
        from_address  — Sender of the first message
        date          — Date header of the first message
        message_count — Number of messages in the thread
        snippet       — Short preview of the latest message
    """
    if not email:
        return []

    try:
        service = _build_gmail_service()
        if service is None:
            return []

        query = f"from:{email} OR to:{email}"
        result = (
            service.users()
            .threads()
            .list(userId="me", q=query, maxResults=max_results)
            .execute()
        )
        raw_threads = result.get("threads", [])

        output = []
        for t in raw_threads:
            try:
                thread_data = (
                    service.users()
                    .threads()
                    .get(
                        userId="me",
                        id=t["id"],
                        format="metadata",
                        metadataHeaders=["Subject", "From", "Date"],
                    )
                    .execute()
                )
                messages = thread_data.get("messages", [])
                if not messages:
                    continue

                first_msg = messages[0]
                headers = {
                    h["name"]: h["value"]
                    for h in first_msg.get("payload", {}).get("headers", [])
                }
                # snippet comes from the last message for a better preview
                snippet = thread_data.get("snippet", "")

                output.append(
                    {
                        "id": t["id"],
                        "subject": headers.get("Subject", "(no subject)"),
                        "from_address": headers.get("From", ""),
                        "date": headers.get("Date", ""),
                        "message_count": len(messages),
                        "snippet": snippet[:120] if snippet else "",
                    }
                )
            except Exception:  # noqa: BLE001
                continue

        return output

    except Exception:  # noqa: BLE001
        return []
