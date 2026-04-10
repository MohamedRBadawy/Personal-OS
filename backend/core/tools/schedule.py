"""Schedule/routine-domain tool schemas and executors for the AI chat agent."""
import logging
from datetime import date

from schedule.models import ScheduleBlock, ScheduleLog

logger = logging.getLogger(__name__)

SCHEMAS = [
    {
        "name": "log_schedule_status",
        "description": "Mark a today's schedule block as done, partial, late, or skipped. Use the block label (e.g. 'Focused work slot', 'Fajr and morning anchor').",
        "input_schema": {
            "type": "object",
            "required": ["block_label", "status"],
            "properties": {
                "block_label": {"type": "string", "description": "Partial or full label of the schedule block"},
                "status": {"type": "string", "enum": ["done", "partial", "late", "skipped"]},
                "note": {"type": "string"},
            },
        },
    },
]


def log_schedule_status(inputs: dict) -> dict:
    today = date.today()
    label = inputs.get("block_label", "")
    status = inputs["status"]
    block = ScheduleBlock.objects.filter(label__icontains=label).first()
    if not block:
        return {"error": f"No schedule block found matching '{label}'"}
    log, created = ScheduleLog.objects.update_or_create(
        block=block,
        date=today,
        defaults={"status": status, "note": inputs.get("note", "")},
    )
    return {"status": "logged", "block": block.label, "log_status": status, "date": str(today), "created": created}


EXECUTORS = {
    "log_schedule_status": log_schedule_status,
}
