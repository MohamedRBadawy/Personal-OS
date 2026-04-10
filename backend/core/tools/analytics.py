"""Analytics-domain tool schemas and executors for the AI chat agent.

Covers: ideas, achievements, and decision logs.
"""
import logging
from datetime import date

from analytics.models import Achievement, DecisionLog, Idea

logger = logging.getLogger(__name__)

SCHEMAS = [
    {
        "name": "capture_idea",
        "description": "Capture a raw idea or thought into the ideas inbox.",
        "input_schema": {
            "type": "object",
            "required": ["title"],
            "properties": {
                "title": {"type": "string"},
                "context": {"type": "string"},
            },
        },
    },
    {
        "name": "log_achievement",
        "description": "Record a win or milestone in the achievements timeline.",
        "input_schema": {
            "type": "object",
            "required": ["title", "domain"],
            "properties": {
                "title": {"type": "string"},
                "domain": {"type": "string"},
                "notes": {"type": "string"},
            },
        },
    },
    {
        "name": "log_decision",
        "description": "Record a significant decision with reasoning.",
        "input_schema": {
            "type": "object",
            "required": ["decision", "reasoning"],
            "properties": {
                "decision": {"type": "string"},
                "reasoning": {"type": "string"},
                "alternatives_considered": {"type": "string"},
            },
        },
    },
]


def capture_idea(inputs: dict) -> dict:
    idea = Idea.objects.create(
        title=inputs["title"],
        context=inputs.get("context", ""),
    )
    return {"status": "captured", "id": str(idea.id), "title": idea.title}


def log_achievement(inputs: dict) -> dict:
    ach = Achievement.objects.create(
        title=inputs["title"],
        domain=inputs["domain"],
        date=date.today(),
        notes=inputs.get("notes", ""),
    )
    return {"status": "recorded", "id": str(ach.id), "title": ach.title}


def log_decision(inputs: dict) -> dict:
    dec = DecisionLog.objects.create(
        decision=inputs["decision"],
        reasoning=inputs["reasoning"],
        alternatives_considered=inputs.get("alternatives_considered", ""),
        date=date.today(),
    )
    return {"status": "logged", "id": str(dec.id), "decision": dec.decision}


EXECUTORS = {
    "capture_idea": capture_idea,
    "log_achievement": log_achievement,
    "log_decision": log_decision,
}
