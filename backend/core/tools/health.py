"""Health-domain tool schemas and executors for the AI chat agent."""
import logging
from datetime import date

from health.models import Habit, HabitLog, HealthLog, MoodLog, SpiritualLog

logger = logging.getLogger(__name__)

SCHEMAS = [
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
]


def log_health_today(inputs: dict) -> dict:
    today = date.today()
    obj, created = HealthLog.objects.update_or_create(
        date=today, defaults=inputs,
    )
    return {"status": "saved", "date": str(today), "created": created}


def log_mood_today(inputs: dict) -> dict:
    today = date.today()
    obj, created = MoodLog.objects.update_or_create(
        date=today, defaults=inputs,
    )
    return {"status": "saved", "date": str(today), "mood_score": obj.mood_score}


def log_spiritual_today(inputs: dict) -> dict:
    today = date.today()
    obj, created = SpiritualLog.objects.update_or_create(
        date=today, defaults=inputs,
    )
    return {"status": "saved", "date": str(today), "prayers_count": obj.prayers_count}


def mark_habit_done(inputs: dict) -> dict:
    name = inputs.get("habit_name", "")
    habit = Habit.objects.filter(name__icontains=name).first()
    if not habit:
        return {"error": f"No habit found matching '{name}'"}
    log, created = HabitLog.objects.update_or_create(
        habit=habit, date=date.today(),
        defaults={"done": True, "note": inputs.get("note", "")},
    )
    return {"status": "marked done", "habit": habit.name, "date": str(log.date)}


EXECUTORS = {
    "log_health_today": log_health_today,
    "log_mood_today": log_mood_today,
    "log_spiritual_today": log_spiritual_today,
    "mark_habit_done": mark_habit_done,
}
