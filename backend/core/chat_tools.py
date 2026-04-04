"""Tool definitions and executors for the AI chat agent.

Each tool maps to an action the AI can take inside the app.
Schemas are passed to Claude as tool definitions.
Executors are called when Claude issues a tool_use block.
"""
import logging
from datetime import date

from django.utils import timezone

from analytics.models import Achievement, DecisionLog, Idea
from finance.models import FinanceEntry
from goals.models import Node
from goals.services import NodeStatusService
from health.models import Habit, HabitLog, HealthLog, MoodLog, SpiritualLog
from pipeline.models import MarketingAction, Opportunity
from pipeline.services import OpportunityLifecycleService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tool schemas — passed to Claude as tool definitions
# ---------------------------------------------------------------------------

TOOL_SCHEMAS = [
    {
        "name": "log_health_today",
        "description": "Log today's physical health data: sleep, energy, exercise, weight.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sleep_hours": {"type": "number", "description": "Hours slept (e.g. 7.5)"},
                "sleep_quality": {"type": "integer", "minimum": 1, "maximum": 5},
                "energy_level": {"type": "integer", "minimum": 1, "maximum": 5},
                "exercise_done": {"type": "boolean"},
                "exercise_type": {"type": "string"},
                "weight_kg": {"type": "number"},
            },
        },
    },
    {
        "name": "log_mood_today",
        "description": "Log today's mood score and optional notes.",
        "input_schema": {
            "type": "object",
            "required": ["mood_score"],
            "properties": {
                "mood_score": {"type": "integer", "minimum": 1, "maximum": 5},
                "notes": {"type": "string"},
            },
        },
    },
    {
        "name": "log_spiritual_today",
        "description": "Log today's prayer completion and Quran reading.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fajr": {"type": "boolean"}, "dhuhr": {"type": "boolean"},
                "asr": {"type": "boolean"}, "maghrib": {"type": "boolean"},
                "isha": {"type": "boolean"},
                "quran_pages": {"type": "integer", "minimum": 0},
                "dhikr_done": {"type": "boolean"},
                "notes": {"type": "string"},
            },
        },
    },
    {
        "name": "mark_habit_done",
        "description": "Mark a habit as completed for today. Searches habits by name.",
        "input_schema": {
            "type": "object",
            "required": ["habit_name"],
            "properties": {
                "habit_name": {"type": "string", "description": "Partial or full habit name"},
                "note": {"type": "string"},
            },
        },
    },
    {
        "name": "create_node",
        "description": "Create a goal, project, task, idea, or burden in the life plan.",
        "input_schema": {
            "type": "object",
            "required": ["title", "type"],
            "properties": {
                "title": {"type": "string"},
                "type": {"type": "string", "enum": ["goal", "project", "task", "sub_task", "idea", "burden"]},
                "category": {"type": "string", "enum": ["Career", "Finance", "Health", "Spiritual", "Family", "Learning", "Personal", "Life"]},
                "notes": {"type": "string"},
                "parent_title": {"type": "string", "description": "Title of the parent node to nest under"},
            },
        },
    },
    {
        "name": "update_node_status",
        "description": "Mark a goal/task/project as done, active, or blocked.",
        "input_schema": {
            "type": "object",
            "required": ["title", "status"],
            "properties": {
                "title": {"type": "string", "description": "Partial or full node title"},
                "status": {"type": "string", "enum": ["active", "available", "blocked", "done"]},
            },
        },
    },
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
    {
        "name": "add_opportunity",
        "description": "Add a new freelance opportunity to the pipeline.",
        "input_schema": {
            "type": "object",
            "required": ["name", "platform"],
            "properties": {
                "name": {"type": "string"},
                "platform": {"type": "string", "enum": ["Upwork", "Freelancer", "Referral", "Direct", "Other"]},
                "description": {"type": "string"},
                "budget": {"type": "number"},
            },
        },
    },
    {
        "name": "log_marketing_action",
        "description": "Record a marketing or visibility action with optional follow-up context.",
        "input_schema": {
            "type": "object",
            "required": ["action", "platform"],
            "properties": {
                "action": {"type": "string"},
                "platform": {"type": "string"},
                "result": {"type": "string"},
            },
        },
    },
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


# ---------------------------------------------------------------------------
# Tool executors — called when Claude issues a tool_use block
# ---------------------------------------------------------------------------

def execute_tool(name: str, inputs: dict) -> dict:
    """Dispatch a tool call to the correct executor. Returns a result dict."""
    executors = {
        "log_health_today": _log_health_today,
        "log_mood_today": _log_mood_today,
        "log_spiritual_today": _log_spiritual_today,
        "mark_habit_done": _mark_habit_done,
        "create_node": _create_node,
        "update_node_status": _update_node_status,
        "add_finance_entry": _add_finance_entry,
        "add_opportunity": _add_opportunity,
        "log_marketing_action": _log_marketing_action,
        "capture_idea": _capture_idea,
        "log_achievement": _log_achievement,
        "log_decision": _log_decision,
    }
    executor = executors.get(name)
    if not executor:
        return {"error": f"Unknown tool: {name}"}
    try:
        return executor(inputs)
    except Exception as exc:
        logger.exception("Tool %s failed: %s", name, exc)
        return {"error": str(exc)}


def _log_health_today(inputs: dict) -> dict:
    today = date.today()
    obj, created = HealthLog.objects.update_or_create(
        date=today, defaults=inputs,
    )
    return {"status": "saved", "date": str(today), "created": created}


def _log_mood_today(inputs: dict) -> dict:
    today = date.today()
    obj, created = MoodLog.objects.update_or_create(
        date=today, defaults=inputs,
    )
    return {"status": "saved", "date": str(today), "mood_score": obj.mood_score}


def _log_spiritual_today(inputs: dict) -> dict:
    today = date.today()
    obj, created = SpiritualLog.objects.update_or_create(
        date=today, defaults=inputs,
    )
    return {"status": "saved", "date": str(today), "prayers_count": obj.prayers_count}


def _mark_habit_done(inputs: dict) -> dict:
    name = inputs.get("habit_name", "")
    habit = Habit.objects.filter(name__icontains=name).first()
    if not habit:
        return {"error": f"No habit found matching '{name}'"}
    log, created = HabitLog.objects.update_or_create(
        habit=habit, date=date.today(),
        defaults={"done": True, "note": inputs.get("note", "")},
    )
    return {"status": "marked done", "habit": habit.name, "date": str(log.date)}


def _create_node(inputs: dict) -> dict:
    parent = None
    if inputs.get("parent_title"):
        parent = Node.objects.filter(title__icontains=inputs["parent_title"]).first()
    node = Node.objects.create(
        title=inputs["title"],
        type=inputs["type"],
        category=inputs.get("category", ""),
        notes=inputs.get("notes", ""),
        parent=parent,
    )
    NodeStatusService.refresh_all()
    return {"status": "created", "id": str(node.id), "title": node.title, "type": node.type}


def _update_node_status(inputs: dict) -> dict:
    node = Node.objects.filter(title__icontains=inputs["title"]).first()
    if not node:
        return {"error": f"No node found matching '{inputs['title']}'"}
    new_status = inputs["status"]
    node.status = new_status
    if new_status == Node.Status.DONE:
        node.completed_at = timezone.now()
    else:
        node.completed_at = None
    node.save()
    NodeStatusService.refresh_all()
    return {"status": "updated", "title": node.title, "new_status": new_status}


def _add_finance_entry(inputs: dict) -> dict:
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


def _add_opportunity(inputs: dict) -> dict:
    opp = Opportunity.objects.create(
        name=inputs["name"],
        platform=inputs["platform"],
        description=inputs.get("description", ""),
        budget=inputs.get("budget"),
        date_found=date.today(),
    )
    OpportunityLifecycleService.enrich(opp)
    return {"status": "created", "id": str(opp.id), "name": opp.name}


def _log_marketing_action(inputs: dict) -> dict:
    action = MarketingAction.objects.create(
        action=inputs["action"],
        platform=inputs["platform"],
        result=inputs.get("result", ""),
        date=date.today(),
    )
    return {"status": "recorded", "id": str(action.id), "action": action.action}


def _capture_idea(inputs: dict) -> dict:
    idea = Idea.objects.create(
        title=inputs["title"],
        context=inputs.get("context", ""),
    )
    return {"status": "captured", "id": str(idea.id), "title": idea.title}


def _log_achievement(inputs: dict) -> dict:
    ach = Achievement.objects.create(
        title=inputs["title"],
        domain=inputs["domain"],
        date=date.today(),
        notes=inputs.get("notes", ""),
    )
    return {"status": "recorded", "id": str(ach.id), "title": ach.title}


def _log_decision(inputs: dict) -> dict:
    dec = DecisionLog.objects.create(
        decision=inputs["decision"],
        reasoning=inputs["reasoning"],
        alternatives_considered=inputs.get("alternatives_considered", ""),
        date=date.today(),
    )
    return {"status": "logged", "id": str(dec.id), "decision": dec.decision}
