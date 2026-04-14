"""Google Calendar service — fetches events for a given date.

Requires three environment variables:
  GOOGLE_CLIENT_ID      — OAuth2 client ID
  GOOGLE_CLIENT_SECRET  — OAuth2 client secret
  GOOGLE_REFRESH_TOKEN  — long-lived refresh token (one-time setup via setup_google_auth.py)

If any variable is missing the service returns an empty list silently.
"""
import datetime
import logging

logger = logging.getLogger(__name__)


def _parse_hhmm(dt_str: str) -> str | None:
    """Extract HH:MM from a Google Calendar datetime string.

    Examples:
      "2026-04-14T09:00:00+02:00"  → "09:00"
      "2026-04-14"                  → None  (all-day event)
    """
    if not dt_str or "T" not in dt_str:
        return None
    return dt_str.split("T")[1][:5]


def _duration_minutes(start_hhmm: str | None, end_hhmm: str | None) -> int:
    if not start_hhmm or not end_hhmm:
        return 60
    sh, sm = map(int, start_hhmm.split(":"))
    eh, em = map(int, end_hhmm.split(":"))
    mins = (eh * 60 + em) - (sh * 60 + sm)
    return max(mins, 15)  # minimum 15 minutes


def get_gcal_events(date_str: str) -> list[dict]:
    """Return a list of GCal events for *date_str* (YYYY-MM-DD).

    Returns an empty list if credentials are not configured or on any error.
    Each item: {id, title, start_time, end_time, all_day, duration_minutes, calendar}
    """
    from django.conf import settings

    client_id     = getattr(settings, "GOOGLE_CLIENT_ID",     "")
    client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", "")
    refresh_token = getattr(settings, "GOOGLE_REFRESH_TOKEN", "")

    if not (client_id and client_secret and refresh_token):
        return []

    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            client_id=client_id,
            client_secret=client_secret,
            token_uri="https://oauth2.googleapis.com/token",
        )
        creds.refresh(Request())

        service = build("calendar", "v3", credentials=creds, cache_discovery=False)

        # Bound the query to the full calendar day in Cairo time (UTC+2)
        time_min = f"{date_str}T00:00:00+02:00"
        time_max = f"{date_str}T23:59:59+02:00"

        result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy="startTime",
                maxResults=30,
            )
            .execute()
        )

        events = []
        for ev in result.get("items", []):
            start_raw = ev["start"].get("dateTime", ev["start"].get("date", ""))
            end_raw   = ev["end"].get("dateTime",   ev["end"].get("date",   ""))

            all_day    = "T" not in start_raw
            start_time = _parse_hhmm(start_raw)
            end_time   = _parse_hhmm(end_raw)

            events.append({
                "id":               ev["id"],
                "title":            ev.get("summary", "Untitled"),
                "start_time":       start_time,
                "end_time":         end_time,
                "all_day":          all_day,
                "duration_minutes": _duration_minutes(start_time, end_time),
                "calendar":         "primary",
            })

        return events

    except Exception as exc:  # noqa: BLE001
        logger.warning("GCal fetch failed for %s: %s", date_str, exc)
        return []
