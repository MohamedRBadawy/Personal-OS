"""AI chat service with smart capture review flows and affected-module metadata."""
import json
import logging
import os
import re

from core.chat_tools import TOOL_SCHEMAS, execute_tool
from core.models import AppSettings, Profile

logger = logging.getLogger(__name__)

MAX_ROUNDS = 5
CAPTURE_MODES = {"command_center_capture"}
STRUCTURAL_KEYWORDS = {
    "restructure",
    "archive",
    "delete",
    "move under",
    "change parent",
    "dependency",
    "dependencies",
}
TOOL_MODULE_MAP = {
    "log_health_today": "health",
    "log_mood_today": "health",
    "log_spiritual_today": "health",
    "mark_habit_done": "health",
    "create_node": "goals",
    "update_node_status": "goals",
    "add_finance_entry": "finance",
    "add_opportunity": "pipeline",
    "log_marketing_action": "pipeline",
    "capture_idea": "analytics",
    "log_achievement": "analytics",
    "log_decision": "analytics",
}
QUICK_ACTION_ALIASES = {
    "task": "task",
    "expense": "expense",
    "health": "health",
    "mood": "mood",
    "spiritual": "spiritual",
    "habit": "habit",
    "idea": "idea",
    "marketing": "marketing",
    "achievement": "achievement",
    "decision": "decision",
}


def _build_system_prompt(context: dict | None = None) -> str:
    """Build the system prompt from live profile, settings, and request context."""
    profile = Profile.objects.first()
    settings = AppSettings.get_solo()

    name = profile.full_name if profile else "Mohamed"
    background = profile.background if profile else ""
    cognitive = profile.cognitive_style if profile else ""
    family = profile.family_context if profile else ""
    target = float(settings.independent_income_target_eur)

    base_prompt = f"""You are the AI inside {name}'s Personal Life OS, a unified system tracking goals, finance, health, schedule, and pipeline.

## Who Mohamed is
{background}

## Cognitive style
{cognitive}

## Family context
{family}

## Your role
You help Mohamed manage his life by both answering questions and taking actions directly inside the app when asked. You have tools to log health data, mark habits done, create tasks, log finances, capture ideas, and more.

## Rules
- When Mohamed asks you to log, add, create, mark, or record something, use the appropriate tool immediately unless the request is explicitly marked as review-first.
- When he asks a question, answer it directly using your knowledge of his context.
- Be concise. One clear sentence per action confirmed. No bullet-point summaries of what you just did.
- Never mention tool names or technical details in your response.
- The independent income target is EUR {target:.0f}/month. The Kyrgyzstan move is the north star.
- Tone: direct, supportive, honest. You are always in his corner.
- Today's date is available via the today-oriented tools, which default automatically."""

    if context:
        return (
            f"{base_prompt}\n\n"
            "## Current request context\n"
            f"{json.dumps(context, ensure_ascii=True, sort_keys=True)}"
        )
    return base_prompt


def _extract_text(content_blocks) -> str:
    """Extract plain text from a list of Anthropic content blocks."""
    parts = []
    for block in content_blocks:
        if hasattr(block, "text"):
            parts.append(block.text)
    return " ".join(parts).strip()


def _affected_modules(actions_taken: list[dict]) -> list[str]:
    """Map executed chat actions to frontend query domains."""
    modules = []
    for action in actions_taken:
        module = TOOL_MODULE_MAP.get(action.get("tool"))
        if module and module not in modules:
            modules.append(module)
    return modules


def _latest_user_text(messages: list[dict]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return str(message.get("content", "")).strip()
    return ""


def _clean_capture_text(text: str, quick_action: str | None = None) -> str:
    cleaned = text.strip()
    prefixes = {
        "task": "create a task:",
        "expense": "log an expense:",
        "health": "log health for today:",
        "mood": "log mood for today:",
        "spiritual": "log spiritual progress for today:",
        "habit": "mark this habit done today:",
        "idea": "capture this idea:",
        "marketing": "record this marketing action:",
        "achievement": "record this achievement:",
        "decision": "log this decision:",
    }
    prefix = prefixes.get(quick_action or "")
    if prefix and cleaned.lower().startswith(prefix):
        return cleaned[len(prefix):].strip()
    return cleaned


def _extract_amount_and_currency(text: str):
    match = re.search(r"(?P<amount>\d+(?:\.\d{1,2})?)\s*(?P<currency>eur|usd|egp|€|\$)?", text.lower())
    if not match:
        return None, None

    amount = match.group("amount")
    raw_currency = match.group("currency") or "eur"
    currency = {
        "eur": "EUR",
        "€": "EUR",
        "usd": "USD",
        "$": "USD",
        "egp": "EGP",
    }.get(raw_currency, "EUR")
    return amount, currency


def _detect_goal_category(text: str):
    haystack = text.lower()
    if any(term in haystack for term in ["client", "proposal", "outreach", "lead", "pipeline", "career", "work"]):
        return "Career"
    if any(term in haystack for term in ["income", "expense", "money", "finance", "budget"]):
        return "Finance"
    if any(term in haystack for term in ["health", "energy", "sleep", "exercise"]):
        return "Health"
    if any(term in haystack for term in ["prayer", "quran", "dhikr", "spiritual"]):
        return "Spiritual"
    if any(term in haystack for term in ["family", "wife", "kids", "children"]):
        return "Family"
    if any(term in haystack for term in ["learn", "course", "study", "book"]):
        return "Learning"
    return "Personal"


def _detect_platform(text: str):
    haystack = text.lower()
    if "linkedin" in haystack:
        return "LinkedIn"
    if "upwork" in haystack:
        return "Upwork"
    if "email" in haystack:
        return "Email"
    if "freelancer" in haystack:
        return "Freelancer"
    return "General"


def _title_from_text(text: str, fallback: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        return fallback
    return cleaned.split(".")[0][:255]


def _build_proposed_action(*, tool: str, input_data: dict, summary: str) -> dict:
    return {
        "tool": tool,
        "module": TOOL_MODULE_MAP.get(tool),
        "summary": summary,
        "input": input_data,
    }


def _plan_single_action(*, text: str, quick_action: str | None) -> dict | None:
    cleaned = _clean_capture_text(text, quick_action)
    quick_action = QUICK_ACTION_ALIASES.get(quick_action or "")

    if quick_action == "task":
        title = _title_from_text(cleaned, "New task")
        return _build_proposed_action(
            tool="create_node",
            input_data={"title": title, "type": "task", "category": _detect_goal_category(cleaned), "notes": cleaned},
            summary=f"Create task: {title}",
        )

    if quick_action == "expense":
        amount, currency = _extract_amount_and_currency(cleaned)
        if not amount:
            return {
                "error": "I need the amount to log that expense. Include something like 120 EGP or 15 USD.",
            }
        source = _title_from_text(re.sub(r"\d+(?:\.\d{1,2})?\s*(eur|usd|egp|€|\$)?", "", cleaned, flags=re.I), "Expense")
        return _build_proposed_action(
            tool="add_finance_entry",
            input_data={
                "type": "expense",
                "source": source,
                "amount": float(amount),
                "currency": currency,
                "is_independent": False,
                "notes": cleaned,
            },
            summary=f"Log expense: {source} ({amount} {currency})",
        )

    if quick_action == "health":
        sleep_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:h|hours?)", cleaned.lower())
        energy_match = re.search(r"energy\s*(?:is|:)?\s*(\d)", cleaned.lower())
        payload = {
            "sleep_hours": float(sleep_match.group(1)) if sleep_match else 7.0,
            "sleep_quality": 3,
            "energy_level": int(energy_match.group(1)) if energy_match else 3,
            "exercise_done": any(term in cleaned.lower() for term in ["walk", "gym", "exercise", "run"]),
            "exercise_type": _title_from_text(cleaned, ""),
        }
        return _build_proposed_action(
            tool="log_health_today",
            input_data=payload,
            summary="Log today's body and energy state",
        )

    if quick_action == "mood":
        mood_match = re.search(r"(\d)", cleaned)
        if not mood_match:
            return {"error": "I need a mood score from 1 to 5 to log that mood entry."}
        score = int(mood_match.group(1))
        return _build_proposed_action(
            tool="log_mood_today",
            input_data={"mood_score": score, "notes": cleaned},
            summary=f"Log mood score {score}/5",
        )

    if quick_action == "spiritual":
        quran_match = re.search(r"(\d+)\s*(?:pages?|page)", cleaned.lower())
        return _build_proposed_action(
            tool="log_spiritual_today",
            input_data={
                "fajr": "fajr" in cleaned.lower(),
                "dhuhr": "dhuhr" in cleaned.lower(),
                "asr": "asr" in cleaned.lower(),
                "maghrib": "maghrib" in cleaned.lower(),
                "isha": "isha" in cleaned.lower(),
                "quran_pages": int(quran_match.group(1)) if quran_match else 0,
                "dhikr_done": "dhikr" in cleaned.lower(),
                "notes": cleaned,
            },
            summary="Log today's spiritual progress",
        )

    if quick_action == "habit":
        habit_name = _title_from_text(cleaned, "Habit")
        return _build_proposed_action(
            tool="mark_habit_done",
            input_data={"habit_name": habit_name, "note": ""},
            summary=f"Mark habit done: {habit_name}",
        )

    if quick_action == "idea":
        title = _title_from_text(cleaned, "New idea")
        return _build_proposed_action(
            tool="capture_idea",
            input_data={"title": title, "context": cleaned},
            summary=f"Capture idea: {title}",
        )

    if quick_action == "marketing":
        action = _title_from_text(cleaned, "Marketing action")
        return _build_proposed_action(
            tool="log_marketing_action",
            input_data={"action": action, "platform": _detect_platform(cleaned), "result": "", "date": None},
            summary=f"Record marketing action: {action}",
        )

    if quick_action == "achievement":
        title = _title_from_text(cleaned, "Achievement")
        return _build_proposed_action(
            tool="log_achievement",
            input_data={"title": title, "domain": _detect_goal_category(cleaned), "notes": cleaned},
            summary=f"Record achievement: {title}",
        )

    if quick_action == "decision":
        title = _title_from_text(cleaned, "Decision")
        return _build_proposed_action(
            tool="log_decision",
            input_data={"decision": title, "reasoning": cleaned, "alternatives_considered": ""},
            summary=f"Record decision: {title}",
        )

    return None


def _keyword_intent(text: str) -> str | None:
    haystack = text.lower()
    if "idea" in haystack:
        return "idea"
    if "expense" in haystack or "income" in haystack:
        return "expense"
    if "mood" in haystack:
        return "mood"
    if "habit" in haystack:
        return "habit"
    if "spiritual" in haystack or "prayer" in haystack or "quran" in haystack:
        return "spiritual"
    if "health" in haystack or "sleep" in haystack or "energy" in haystack:
        return "health"
    if "marketing" in haystack or "outreach" in haystack or "follow up" in haystack:
        return "marketing"
    if "achievement" in haystack or "win" in haystack:
        return "achievement"
    if "decision" in haystack:
        return "decision"
    if "task" in haystack:
        return "task"
    return None


def _plan_capture(text: str, context: dict | None = None) -> dict | None:
    context = context or {}
    quick_action = QUICK_ACTION_ALIASES.get(str(context.get("quick_action") or ""))

    if quick_action:
        planned = _plan_single_action(text=text, quick_action=quick_action)
        if planned and planned.get("error"):
            return {"error": planned["error"], "requires_confirmation": False, "proposed_actions": []}
        if planned:
            return {"requires_confirmation": False, "proposed_actions": [planned]}

    clauses = [segment.strip() for segment in re.split(r"\n|;", text) if segment.strip()]
    if len(clauses) == 1 and " and " in text.lower():
        clauses = [segment.strip() for segment in re.split(r"\band\b", text, flags=re.I) if segment.strip()]

    proposed_actions = []
    for clause in clauses:
        intent = _keyword_intent(clause)
        if not intent:
            continue
        planned = _plan_single_action(text=clause, quick_action=intent)
        if planned and not planned.get("error"):
            proposed_actions.append(planned)

    if proposed_actions:
        requires_confirmation = len(proposed_actions) > 1 or any(
            keyword in text.lower() for keyword in STRUCTURAL_KEYWORDS
        )
        return {
            "requires_confirmation": requires_confirmation,
            "proposed_actions": proposed_actions,
        }

    return None


def _execute_proposed_actions(proposed_actions: list[dict]) -> dict:
    actions_taken = []
    for action in proposed_actions:
        result = execute_tool(action["tool"], action["input"])
        actions_taken.append({"tool": action["tool"], "result": result})

    affected = _affected_modules(actions_taken)
    if len(actions_taken) == 1:
        reply = proposed_actions[0]["summary"]
    else:
        reply = f"Applied {len(actions_taken)} changes across {', '.join(affected)}."
    return {
        "reply": reply,
        "actions": actions_taken,
        "affected_modules": affected,
        "proposed_actions": proposed_actions,
        "requires_confirmation": False,
    }


def _review_response(proposed_actions: list[dict]) -> dict:
    affected_modules = []
    for item in proposed_actions:
        module = item.get("module")
        if module and module not in affected_modules:
            affected_modules.append(module)
    return {
        "reply": "I mapped this into a few changes. Review them before I apply anything structural or multi-step.",
        "actions": [],
        "affected_modules": affected_modules,
        "proposed_actions": proposed_actions,
        "requires_confirmation": True,
    }


def run_chat(messages: list[dict], context: dict | None = None) -> dict:
    """Run the agentic chat loop and return reply, actions, and capture metadata."""
    context = context or {}
    latest_user_text = _latest_user_text(messages)
    mode = str(context.get("mode") or "")
    surface = str(context.get("surface") or "")

    if context.get("confirm_capture") and isinstance(context.get("proposed_actions"), list):
        return _execute_proposed_actions(context["proposed_actions"])

    if mode in CAPTURE_MODES or surface == "command_center":
        capture_plan = _plan_capture(latest_user_text, context)
        if capture_plan:
            if capture_plan.get("error"):
                return {
                    "reply": capture_plan["error"],
                    "actions": [],
                    "affected_modules": [],
                    "proposed_actions": [],
                    "requires_confirmation": False,
                }
            if capture_plan["requires_confirmation"]:
                return _review_response(capture_plan["proposed_actions"])
            return _execute_proposed_actions(capture_plan["proposed_actions"])

    if mode in {"goal_restructure", "proposal_draft"} and any(
        keyword in latest_user_text.lower() for keyword in STRUCTURAL_KEYWORDS
    ):
        plan = _plan_capture(latest_user_text, context) or {"proposed_actions": []}
        if plan["proposed_actions"]:
            return _review_response(plan["proposed_actions"])

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    except Exception as exc:
        logger.warning("Anthropic client unavailable: %s - using fallback", exc)
        return _fallback_response()

    system_prompt = _build_system_prompt(context=context)
    actions_taken = []
    current_messages = list(messages)

    for _ in range(MAX_ROUNDS):
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            system=system_prompt,
            tools=TOOL_SCHEMAS,
            messages=current_messages,
        )

        if response.stop_reason == "end_turn":
            return {
                "reply": _extract_text(response.content),
                "actions": actions_taken,
                "affected_modules": _affected_modules(actions_taken),
                "proposed_actions": [],
                "requires_confirmation": False,
            }

        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            logger.info("Chat tool call: %s(%s)", block.name, json.dumps(block.input)[:120])
            result = execute_tool(block.name, block.input)
            actions_taken.append({"tool": block.name, "result": result})
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                },
            )

        if not tool_results:
            return {
                "reply": _extract_text(response.content) or "Done.",
                "actions": actions_taken,
                "affected_modules": _affected_modules(actions_taken),
                "proposed_actions": [],
                "requires_confirmation": False,
            }

        current_messages.append({"role": "assistant", "content": response.content})
        current_messages.append({"role": "user", "content": tool_results})

    return {
        "reply": "I've completed the actions. Let me know if you need anything else.",
        "actions": actions_taken,
        "affected_modules": _affected_modules(actions_taken),
        "proposed_actions": [],
        "requires_confirmation": False,
    }


def _fallback_response() -> dict:
    """Deterministic fallback when Anthropic is unavailable."""
    return {
        "reply": (
            "The AI service is not configured. Set ANTHROPIC_API_KEY in your .env file "
            "to enable the AI assistant."
        ),
        "actions": [],
        "affected_modules": [],
        "proposed_actions": [],
        "requires_confirmation": False,
    }
