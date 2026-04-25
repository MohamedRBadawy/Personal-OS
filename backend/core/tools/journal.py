"""Journal-domain tool schemas and executors for the AI chat agent."""
from django.utils import timezone

from journal.models import JournalEntry


SCHEMAS = [
    {
        "name": "log_journal_entry",
        "description": "Create or update today's journal entry with wins, gratitude, mood note, or tomorrow focus.",
        "input_schema": {
            "type": "object",
            "properties": {
                "mood_note": {"type": "string"},
                "gratitude": {"type": "string"},
                "wins": {"type": "string"},
                "tomorrow_focus": {"type": "string"},
            },
        },
    },
]


def log_journal_entry(inputs: dict) -> dict:
    today = timezone.localdate()
    allowed = ["mood_note", "gratitude", "wins", "tomorrow_focus"]
    defaults = {field: inputs.get(field, "") for field in allowed if inputs.get(field)}
    entry, created = JournalEntry.objects.update_or_create(
        date=today,
        defaults=defaults,
    )
    return {"status": "logged", "id": entry.id, "date": entry.date.isoformat(), "created": created}


EXECUTORS = {
    "log_journal_entry": log_journal_entry,
}
