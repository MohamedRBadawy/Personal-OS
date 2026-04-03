"""AI chat service — agentic loop with tool execution.

Receives the conversation history, sends it to Claude with tool definitions,
executes any tool calls Claude makes, then returns the final response and
a list of actions that were taken.
"""
import json
import logging
import os

from core.chat_tools import TOOL_SCHEMAS, execute_tool
from core.models import AppSettings, Profile

logger = logging.getLogger(__name__)

# Maximum tool-use rounds per message to prevent infinite loops
MAX_ROUNDS = 5


def _build_system_prompt() -> str:
    """Build the system prompt from live profile and settings data."""
    profile = Profile.objects.first()
    settings = AppSettings.get_solo()

    name = profile.full_name if profile else "Mohamed"
    background = profile.background if profile else ""
    cognitive = profile.cognitive_style if profile else ""
    family = profile.family_context if profile else ""
    target = float(settings.independent_income_target_eur)

    return f"""You are the AI inside {name}'s Personal Life OS — a unified system tracking goals, finance, health, schedule, and pipeline.

## Who Mohamed is
{background}

## Cognitive style
{cognitive}

## Family context
{family}

## Your role
You help Mohamed manage his life by both answering questions AND taking actions directly inside the app when asked. You have tools to log health data, mark habits done, create tasks, log finances, capture ideas, and more.

## Rules
- When Mohamed asks you to log, add, create, mark, or record something — use the appropriate tool immediately. Don't ask for confirmation unless critical information is missing.
- When he asks a question — answer it directly using your knowledge of his context.
- Be concise. One clear sentence per action confirmed. No bullet-point summaries of what you just did.
- Never mention tool names or technical details in your response.
- The independent income target is €{target:.0f}/month. The Kyrgyzstan move is the north star.
- Tone: direct, supportive, honest. You are always in his corner.
- Today's date is available via the log_health_today and similar tools — they default to today automatically."""


def run_chat(messages: list[dict]) -> dict:
    """Run the agentic chat loop. Returns final message text and actions taken.

    Args:
        messages: Full conversation history in Anthropic format
                  [{"role": "user"|"assistant", "content": "..."}]

    Returns:
        {"reply": str, "actions": [{"tool": str, "result": dict}]}
    """
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    except Exception as exc:
        logger.warning("Anthropic client unavailable: %s — using fallback", exc)
        return _fallback_response(messages)

    system_prompt = _build_system_prompt()
    actions_taken = []
    current_messages = list(messages)

    for round_num in range(MAX_ROUNDS):
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            system=system_prompt,
            tools=TOOL_SCHEMAS,
            messages=current_messages,
        )

        # If Claude is done (no tool calls), return the final text
        if response.stop_reason == "end_turn":
            reply_text = _extract_text(response.content)
            return {"reply": reply_text, "actions": actions_taken}

        # Process all tool_use blocks in this response
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            logger.info("Chat tool call: %s(%s)", block.name, json.dumps(block.input)[:120])
            result = execute_tool(block.name, block.input)
            actions_taken.append({"tool": block.name, "result": result})
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(result),
            })

        if not tool_results:
            # No tool calls and not end_turn — extract any text and stop
            reply_text = _extract_text(response.content)
            return {"reply": reply_text or "Done.", "actions": actions_taken}

        # Add assistant response + tool results to conversation and loop
        current_messages.append({"role": "assistant", "content": response.content})
        current_messages.append({"role": "user", "content": tool_results})

    # Safety valve: exceeded max rounds
    return {
        "reply": "I've completed the actions. Let me know if you need anything else.",
        "actions": actions_taken,
    }


def _extract_text(content_blocks) -> str:
    """Extract plain text from a list of Anthropic content blocks."""
    parts = []
    for block in content_blocks:
        if hasattr(block, "text"):
            parts.append(block.text)
    return " ".join(parts).strip()


def _fallback_response(messages: list[dict]) -> dict:
    """Deterministic fallback when Anthropic API is unavailable."""
    last = messages[-1]["content"] if messages else ""
    return {
        "reply": (
            "The AI service is not configured. Set ANTHROPIC_API_KEY in your .env file "
            "to enable the AI assistant."
        ),
        "actions": [],
    }
