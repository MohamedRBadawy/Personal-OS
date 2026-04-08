"""AI chat service with smart capture review flows and affected-module metadata."""
import json
import logging
import os
import re

from core.chat_tools import TOOL_SCHEMAS, execute_tool
from core.models import AppSettings, Profile

logger = logging.getLogger(__name__)

MAX_ROUNDS = 3  # Reduced from 5 to conserve Gemini free-tier quota (5 rounds × N msgs/day exhausts quickly)
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

    mode = str((context or {}).get("mode") or "")
    is_thinking_mode = mode in {"task_thinking", "thinking"}

    base_prompt = f"""You are the AI inside {name}'s Personal Life OS, a unified system tracking goals, finance, health, schedule, and pipeline.

## Who Mohamed is
{background}

## Cognitive style
{cognitive}

## Family context
{family}

## Your role
You help Mohamed manage his life by both answering questions and taking actions directly inside the app when asked. You have tools to log health data, mark habits and schedule blocks done, create tasks, update goals, log finances, capture ideas, record decisions, update opportunity status, and more.

## Available actions (use tools for these)
- Health: log sleep/energy/exercise, log mood, log prayers/Quran, mark habits done
- Goals: create nodes (goal/project/task/idea/burden), update status, update notes
- Schedule: mark schedule blocks as done/partial/late/skipped
- Finance: add income or expense entries
- Pipeline: add opportunities, update opportunity status (applied/won/lost), mark follow-ups done
- Ideas & thinking: capture ideas, log decisions with reasoning, log achievements

## Rules
- When Mohamed asks you to log, add, create, mark, or record something, use the appropriate tool immediately unless the request is explicitly marked as review-first.
- When he asks a question, answer it directly using your knowledge of his context.
- Be concise. One clear sentence per action confirmed. No bullet-point summaries of what you just did.
- Never mention tool names or technical details in your response.
- The independent income target is EUR {target:.0f}/month. The Kyrgyzstan move is the north star.
- Tone: direct, supportive, honest. You are always in his corner.
- Today's date is available via the today-oriented tools, which default automatically."""

    thinking_extension = """

## Thinking mode — active
Mohamed wants to reason through something, not just log data. Your job shifts:
1. **Understand first.** Ask one focused clarifying question if the problem is ambiguous, then move forward.
2. **Diagnose before prescribing.** Identify the real constraint or tension before suggesting a direction.
3. **Present genuine trade-offs.** Don't flatten hard choices. Name what would be gained and what would be lost.
4. **Challenge gently.** If you see a blind spot, a contradiction, or a softer path, say so clearly but without lecturing.
5. **Concrete over abstract.** Ground every insight in Mohamed's actual situation: the income goal, the family move, the pipeline state.
6. **End with one decision-forcing question or a crisp recommendation**, not a list of options.
7. **If a conclusion or decision emerges**, offer to log it as a decision record immediately.
Tone: a sharp, honest thinking partner — not a life coach, not a cheerleader. Say the hard thing if it's true."""

    if is_thinking_mode:
        base_prompt = base_prompt + thinking_extension

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

    provider = os.environ.get("AI_PROVIDER", "deterministic").lower()
    system_prompt = _build_system_prompt(context=context)

    if provider == "gemini":
        return _run_gemini_chat(messages, system_prompt)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    except Exception as exc:
        logger.warning("Anthropic client unavailable: %s - using fallback", exc)
        return _fallback_response()

    actions_taken = []
    current_messages = list(messages)

    try:
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

    except Exception as exc:
        exc_str = str(exc)
        logger.warning("Anthropic chat error: %s", exc, exc_info=True)
        if "401" in exc_str or "authentication" in exc_str.lower() or "invalid x-api-key" in exc_str.lower():
            return {
                "reply": "The Anthropic API key is invalid or missing. Check ANTHROPIC_API_KEY in your .env file.",
                "actions": [],
                "affected_modules": [],
                "proposed_actions": [],
                "requires_confirmation": False,
            }
        if "529" in exc_str or "overloaded" in exc_str.lower():
            return {
                "reply": "The AI is temporarily overloaded. Please try again in a moment.",
                "actions": [],
                "affected_modules": [],
                "proposed_actions": [],
                "requires_confirmation": False,
            }
        return {
            "reply": f"I ran into an issue reaching the AI. Please try again in a moment.",
            "actions": [],
            "affected_modules": [],
            "proposed_actions": [],
            "requires_confirmation": False,
        }


def _build_gemini_tools():
    """Build Gemini Tool list from the Anthropic-format TOOL_SCHEMAS."""
    try:
        from google.genai import types as gt

        declarations = [
            gt.FunctionDeclaration(
                name=t["name"],
                description=t.get("description", ""),
                parameters=t.get("input_schema", {"type": "object", "properties": {}}),
            )
            for t in TOOL_SCHEMAS
        ]
        return [gt.Tool(function_declarations=declarations)]
    except Exception as exc:
        logger.warning("Could not build Gemini tool schemas: %s", exc)
        return []


def _run_gemini_chat(messages: list[dict], system_prompt: str) -> dict:
    """Agentic chat loop powered by Gemini with function calling."""
    try:
        from google import genai as ggenai
        from google.genai import types as gt
    except Exception as exc:
        logger.warning("google-genai unavailable: %s", exc)
        return _fallback_response()

    api_key = os.environ.get("GEMINI_API_KEY", "")
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    if not api_key:
        return _fallback_response()

    try:
        client = ggenai.Client(api_key=api_key)
        tools = _build_gemini_tools()

        # Build contents list from message history
        contents = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            content = msg.get("content", "")
            if isinstance(content, str) and content.strip():
                contents.append(gt.Content(role=role, parts=[gt.Part(text=content)]))

        if not contents:
            return _fallback_response()

        actions_taken = []

        def _generate_with_retry(contents_arg):
            """Call generate_content with one automatic retry on short-window 429s."""
            import time as _time
            for attempt in range(2):
                try:
                    return client.models.generate_content(
                        model=model_name,
                        contents=contents_arg,
                        config=gt.GenerateContentConfig(
                            system_instruction=system_prompt,
                            tools=tools,
                            max_output_tokens=1024,
                        ),
                    )
                except Exception as _exc:
                    _s = str(_exc)
                    if attempt == 0 and ("429" in _s or "RESOURCE_EXHAUSTED" in _s):
                        _m = re.search(r"retry in ([\d.]+)s", _s)
                        _wait = float(_m.group(1)) + 1 if _m else None
                        if _wait and _wait <= 65:  # only auto-retry for short RPM windows
                            logger.info("Gemini 429 — waiting %.1fs then retrying", _wait)
                            _time.sleep(_wait)
                            continue
                    raise
            raise RuntimeError("unreachable")

        for _ in range(MAX_ROUNDS):
            response = _generate_with_retry(contents)

            candidate = response.candidates[0] if response.candidates else None
            if not candidate:
                break

            response_parts = candidate.content.parts if candidate.content else []

            # Collect function calls
            fn_calls = [
                p.function_call for p in response_parts
                if getattr(p, "function_call", None) and p.function_call.name
            ]

            if not fn_calls:
                # End turn — extract text
                text_parts = [p.text for p in response_parts if getattr(p, "text", None)]
                return {
                    "reply": " ".join(text_parts).strip() or "Done.",
                    "actions": actions_taken,
                    "affected_modules": _affected_modules(actions_taken),
                    "proposed_actions": [],
                    "requires_confirmation": False,
                }

            # Append assistant response to history
            contents.append(gt.Content(role="model", parts=response_parts))

            # Execute tools and build function response parts
            fn_response_parts = []
            for fc in fn_calls:
                tool_input = dict(fc.args) if hasattr(fc, "args") else {}
                logger.info("Gemini tool call: %s(%s)", fc.name, json.dumps(tool_input)[:120])
                result = execute_tool(fc.name, tool_input)
                actions_taken.append({"tool": fc.name, "result": result})
                fn_response_parts.append(
                    gt.Part(
                        function_response=gt.FunctionResponse(
                            name=fc.name,
                            response={"result": json.dumps(result)},
                        )
                    )
                )

            # Append tool results as user turn
            contents.append(gt.Content(role="user", parts=fn_response_parts))

        return {
            "reply": "Actions completed. Let me know if you need anything else.",
            "actions": actions_taken,
            "affected_modules": _affected_modules(actions_taken),
            "proposed_actions": [],
            "requires_confirmation": False,
        }

    except Exception as exc:
        exc_str = str(exc)
        logger.warning("Gemini chat error: %s", exc, exc_info=True)

        # 429 quota / rate-limit: give a specific, actionable message
        if "429" in exc_str or "RESOURCE_EXHAUSTED" in exc_str or "quota" in exc_str.lower():
            # Try to extract the retry delay from the error message
            import re as _re
            delay_match = _re.search(r"retry in ([\d.]+)s", exc_str)
            delay_hint = f" Please wait {int(float(delay_match.group(1))) + 1} seconds and try again." if delay_match else " Please wait a moment and try again."
            return {
                "reply": f"The AI is temporarily rate-limited (free tier quota).{delay_hint}",
                "actions": [],
                "affected_modules": [],
                "proposed_actions": [],
                "requires_confirmation": False,
            }

        return {
            "reply": "I ran into an issue reaching the AI. Please try again in a moment.",
            "actions": [],
            "affected_modules": [],
            "proposed_actions": [],
            "requires_confirmation": False,
        }


def _fallback_response() -> dict:
    """Deterministic fallback when no AI provider is available."""
    return {
        "reply": (
            "The AI service is not configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY "
            "in your .env file to enable the AI assistant."
        ),
        "actions": [],
        "affected_modules": [],
        "proposed_actions": [],
        "requires_confirmation": False,
    }
