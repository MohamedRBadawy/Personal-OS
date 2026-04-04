"""AI chat service with agentic tool execution and affected-module metadata."""
import json
import logging
import os

from core.chat_tools import TOOL_SCHEMAS, execute_tool
from core.models import AppSettings, Profile

logger = logging.getLogger(__name__)

MAX_ROUNDS = 5
TOOL_MODULE_MAP = {
    "log_health_today": "health",
    "log_mood_today": "health",
    "log_spiritual_today": "health",
    "mark_habit_done": "health",
    "create_node": "goals",
    "update_node_status": "goals",
    "add_finance_entry": "finance",
    "add_opportunity": "pipeline",
    "capture_idea": "analytics",
    "log_achievement": "analytics",
    "log_decision": "analytics",
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
- When Mohamed asks you to log, add, create, mark, or record something, use the appropriate tool immediately. Do not ask for confirmation unless critical information is missing.
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


def run_chat(messages: list[dict], context: dict | None = None) -> dict:
    """Run the agentic chat loop and return reply, actions, and affected domains."""
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
            }

        current_messages.append({"role": "assistant", "content": response.content})
        current_messages.append({"role": "user", "content": tool_results})

    return {
        "reply": "I've completed the actions. Let me know if you need anything else.",
        "actions": actions_taken,
        "affected_modules": _affected_modules(actions_taken),
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
    }
