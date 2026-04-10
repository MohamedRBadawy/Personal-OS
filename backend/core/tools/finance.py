"""Finance-domain tool schemas and executors for the AI chat agent."""
import logging
from datetime import date

from finance.models import FinanceEntry

logger = logging.getLogger(__name__)

SCHEMAS = [
    {
        "name": "add_finance_entry",
        "description": "Log an income or expense transaction.",
        "input_schema": {
            "type": "object",
            "required": ["type", "source", "amount", "currency"],
            "properties": {
                "type": {"type": "string", "enum": ["income", "expense"]},
                "source": {"type": "string"},
                "amount": {"type": "number"},
                "currency": {"type": "string", "enum": ["EUR", "USD", "EGP"]},
                "is_independent": {"type": "boolean", "description": "True if NOT from K Line Europe"},
                "notes": {"type": "string"},
            },
        },
    },
]


def add_finance_entry(inputs: dict) -> dict:
    entry = FinanceEntry.objects.create(
        type=inputs["type"],
        source=inputs["source"],
        amount=inputs["amount"],
        currency=inputs["currency"],
        is_independent=inputs.get("is_independent", False),
        date=date.today(),
        notes=inputs.get("notes", ""),
    )
    from finance.services import FinanceMetricsService
    FinanceMetricsService.sync_goal_status()
    return {"status": "saved", "id": str(entry.id), "amount": float(entry.amount), "currency": entry.currency}


EXECUTORS = {
    "add_finance_entry": add_finance_entry,
}
