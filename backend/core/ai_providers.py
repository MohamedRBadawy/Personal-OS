"""Concrete AI provider implementations: Anthropic Claude and Google Gemini."""
import json
import logging

from core.ai_base import DeterministicAIProvider
from core.ai_prompts import (
    build_morning_briefing_request,
    build_opportunity_scoring_request,
    build_pattern_analysis_request,
    build_timeline_week_request,
    build_weekly_review_request,
)

try:
    from anthropic import Anthropic
except Exception:  # pragma: no cover
    Anthropic = None

try:
    from google import genai as google_genai
    from google.genai import types as genai_types
except Exception:  # pragma: no cover
    google_genai = None
    genai_types = None


logger = logging.getLogger(__name__)


class AnthropicAIProvider(DeterministicAIProvider):
    """Anthropic-backed provider with deterministic fallback on any provider failure."""

    def __init__(self, *, api_key, model, timeout_seconds, max_tokens):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.max_tokens = max_tokens

    def _fallback(self, *, operation_name, fallback_callable):
        try:
            return fallback_callable()
        except Exception:  # pragma: no cover - fallback should be very stable
            logger.exception("Deterministic fallback failed for %s", operation_name)
            raise

    def _run_or_fallback(self, *, operation_name, call_live, call_fallback):
        try:
            return call_live()
        except Exception as exc:  # pragma: no cover - exercised through fallback tests
            logger.warning("Anthropic provider fell back during %s: %s", operation_name, exc, exc_info=True)
            return self._fallback(operation_name=operation_name, fallback_callable=call_fallback)

    def _extract_text(self, response):
        segments = []
        for block in getattr(response, "content", []):
            block_type = getattr(block, "type", None)
            block_text = getattr(block, "text", None)
            if block_type is None and isinstance(block, dict):
                block_type = block.get("type")
                block_text = block.get("text")
            if block_type == "text" and block_text:
                segments.append(block_text)
        if not segments:
            raise ValueError("Anthropic response did not include a text content block.")
        return "".join(segments)

    def _request_json(self, *, system_prompt, user_prompt, schema, max_tokens=None):
        if Anthropic is None:
            raise RuntimeError("anthropic package is not installed.")

        client = Anthropic(api_key=self.api_key, timeout=self.timeout_seconds)
        response = client.messages.create(
            model=self.model,
            max_tokens=max_tokens or self.max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": schema,
                },
            },
        )
        stop_reason = getattr(response, "stop_reason", None)
        if stop_reason in {"refusal", "max_tokens"}:
            raise ValueError(f"Anthropic structured output stopped early with reason: {stop_reason}")
        return json.loads(self._extract_text(response))

    @staticmethod
    def _require_string(payload, key):
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"Expected a non-empty string for '{key}'.")
        return value.strip()

    @classmethod
    def _require_string_list(cls, payload, key, *, max_items=None):
        value = payload.get(key)
        if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
            raise ValueError(f"Expected '{key}' to be a list of non-empty strings.")
        cleaned = [item.strip() for item in value]
        if max_items is not None and len(cleaned) > max_items:
            raise ValueError(f"Expected '{key}' to contain at most {max_items} items.")
        return cleaned

    def generate_morning_briefing(self, *, profile, finance_summary, health_summary, top_priorities, blockers_text):
        signals = self.cross_domain_insights(
            finance_summary=finance_summary,
            health_summary=health_summary,
        )
        if blockers_text:
            signals.append("A blocker was captured today and should be addressed early.")

        def call_live():
            request = build_morning_briefing_request(
                profile=profile,
                finance_summary=finance_summary,
                health_summary=health_summary,
                top_priorities=top_priorities,
                blockers_text=blockers_text,
                signals=signals,
            )
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=min(self.max_tokens, 900),
            )
            return {
                "briefing_text": self._require_string(payload, "briefing_text"),
                "top_priorities": self._require_string_list(payload, "top_priorities", max_items=3),
                "observations": self._require_string_list(payload, "observations", max_items=4),
                "encouragement": self._require_string(payload, "encouragement"),
            }

        return self._run_or_fallback(
            operation_name="generate_morning_briefing",
            call_live=call_live,
            call_fallback=lambda: super(AnthropicAIProvider, self).generate_morning_briefing(
                profile=profile,
                finance_summary=finance_summary,
                health_summary=health_summary,
                top_priorities=top_priorities,
                blockers_text=blockers_text,
            ),
        )

    def score_opportunity(self, *, opportunity, active_goal_titles):
        def call_live():
            request = build_opportunity_scoring_request(
                opportunity=opportunity,
                active_goal_titles=active_goal_titles,
            )
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=min(self.max_tokens, 1000),
            )
            fit_score = payload.get("fit_score")
            if not isinstance(fit_score, int) or fit_score < 0 or fit_score > 100:
                raise ValueError("Expected fit_score to be an integer between 0 and 100.")
            return {
                "fit_score": fit_score,
                "fit_reasoning": self._require_string(payload, "fit_reasoning"),
                "proposal_draft": self._require_string(payload, "proposal_draft"),
            }

        return self._run_or_fallback(
            operation_name="score_opportunity",
            call_live=call_live,
            call_fallback=lambda: super(AnthropicAIProvider, self).score_opportunity(
                opportunity=opportunity,
                active_goal_titles=active_goal_titles,
            ),
        )

    def generate_weekly_review(self, *, context):
        def call_live():
            request = build_weekly_review_request(context=context)
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=self.max_tokens,
            )
            return self._require_string(payload, "report")

        return self._run_or_fallback(
            operation_name="generate_weekly_review",
            call_live=call_live,
            call_fallback=lambda: super(AnthropicAIProvider, self).generate_weekly_review(context=context),
        )

    def analyze_patterns(self, *, overview):
        def call_live():
            request = build_pattern_analysis_request(overview=overview)
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=min(self.max_tokens, 700),
            )
            return self._require_string(payload, "pattern_analysis")

        return self._run_or_fallback(
            operation_name="analyze_patterns",
            call_live=call_live,
            call_fallback=lambda: super(AnthropicAIProvider, self).analyze_patterns(overview=overview),
        )

    def summarize_timeline_week(self, *, week_start, week_end, today, days, top_priorities):
        def call_live():
            request = build_timeline_week_request(
                week_start=week_start,
                week_end=week_end,
                today=today,
                top_priorities=top_priorities,
                days=days,
            )
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=self.max_tokens,
            )
            entries = payload.get("days")
            if not isinstance(entries, list):
                raise ValueError("Expected timeline response to contain a days list.")
            note_by_date = {}
            for entry in entries:
                if not isinstance(entry, dict):
                    raise ValueError("Expected each timeline entry to be an object.")
                date_value = self._require_string(entry, "date")
                note_by_date[date_value] = self._require_string(entry, "ai_note")

            expected_dates = [day["date"] for day in days]
            if set(note_by_date.keys()) != set(expected_dates):
                raise ValueError("Timeline response did not include exactly the requested dates.")

            return [
                {
                    "date": date_value,
                    "ai_note": note_by_date[date_value],
                }
                for date_value in expected_dates
            ]

        return self._run_or_fallback(
            operation_name="summarize_timeline_week",
            call_live=call_live,
            call_fallback=lambda: super(AnthropicAIProvider, self).summarize_timeline_week(
                week_start=week_start,
                week_end=week_end,
                today=today,
                days=days,
                top_priorities=top_priorities,
            ),
        )

    def generate_live_suggestions(self, *, context):
        def call_live():
            from core.ai_prompts import build_ai_suggestions_request  # noqa: PLC0415
            request = build_ai_suggestions_request(context=context)
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=min(self.max_tokens, 1200),
            )
            items = payload.get("suggestions", [])
            if not isinstance(items, list):
                raise ValueError("Expected suggestions list.")
            result = []
            for item in items[:5]:
                if not isinstance(item, dict):
                    continue
                result.append({
                    "topic": str(item.get("topic", "ai_insight")),
                    "module": str(item.get("module", "analytics")),
                    "text": str(item.get("text", "")).strip(),
                })
            return [s for s in result if s["text"]]

        return self._run_or_fallback(
            operation_name="generate_live_suggestions",
            call_live=call_live,
            call_fallback=lambda: super(AnthropicAIProvider, self).generate_live_suggestions(context=context),
        )

    def decompose_node(self, *, node_title, node_type, node_notes, node_why, active_goal_titles):
        def call_live():
            from core.ai_prompts import build_node_decomposition_request  # noqa: PLC0415
            request = build_node_decomposition_request(
                node_title=node_title,
                node_type=node_type,
                node_notes=node_notes,
                node_why=node_why,
                active_goal_titles=active_goal_titles,
            )
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=min(self.max_tokens, 1000),
            )
            items = payload.get("subtasks", [])
            if not isinstance(items, list):
                raise ValueError("Expected subtasks list.")
            result = []
            for item in items[:5]:
                if not isinstance(item, dict):
                    continue
                result.append({
                    "title": str(item.get("title", "")).strip(),
                    "type": str(item.get("type", "task")),
                    "effort": str(item.get("effort", "1h")),
                    "notes": str(item.get("notes", "")).strip(),
                })
            return [s for s in result if s["title"]]

        return self._run_or_fallback(
            operation_name="decompose_node",
            call_live=call_live,
            call_fallback=lambda: super(AnthropicAIProvider, self).decompose_node(
                node_title=node_title,
                node_type=node_type,
                node_notes=node_notes,
                node_why=node_why,
                active_goal_titles=active_goal_titles,
            ),
        )

    def suggest_next_action(self, *, top_nodes, routine_pct, due_follow_ups_count, profile_context: str = ""):
        def call_live():
            nodes_text = "\n".join(
                f"- {n['title']} (type: {n['type']}, enables {n['dependent_count']} others, "
                f"leverage: {n['leverage_score']}, status: {n['status']}, id: {n['id']})"
                for n in top_nodes[:5]
            )
            profile_line = f"\nProfile: {profile_context}" if profile_context else ""
            user_prompt = (
                f"Routine completion today: {routine_pct}%\n"
                f"Pending marketing follow-ups: {due_follow_ups_count}\n"
                f"Top priority nodes by leverage:\n{nodes_text}"
                f"{profile_line}\n\n"
                "What is the single most important action to take right now?"
            )
            system_prompt = (
                "You are Mohamed's personal AI operating system. Given his current context, "
                "recommend ONE specific, concrete action to take right now. "
                "Be direct and specific — not generic advice. Reference the actual node or follow-up."
            )
            result = self._request_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema={
                    "type": "object",
                    "properties": {
                        "action": {"type": "string", "description": "Specific action to take"},
                        "reason": {"type": "string", "description": "Why this action right now"},
                        "node_id": {"type": ["string", "null"], "description": "The node ID if applicable"},
                    },
                    "required": ["action", "reason", "node_id"],
                },
                max_tokens=300,
            )
            if not isinstance(result.get("action"), str) or not result["action"].strip():
                raise ValueError("Expected non-empty action string.")
            return {
                "action": result["action"].strip(),
                "reason": str(result.get("reason", "")).strip(),
                "node_id": result.get("node_id"),
            }

        return self._run_or_fallback(
            operation_name="suggest_next_action",
            call_live=call_live,
            call_fallback=lambda: super(AnthropicAIProvider, self).suggest_next_action(
                top_nodes=top_nodes,
                routine_pct=routine_pct,
                due_follow_ups_count=due_follow_ups_count,
                profile_context=profile_context,
            ),
        )


class GeminiAIProvider(DeterministicAIProvider):
    """Gemini-backed provider with deterministic fallback on any error."""

    def __init__(self, *, api_key, model, max_tokens):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens

    def _request_json(self, *, system_prompt, user_prompt, schema, max_tokens=None):
        if google_genai is None:
            raise RuntimeError("google-genai package is not installed.")
        client = google_genai.Client(api_key=self.api_key)
        response = client.models.generate_content(
            model=self.model,
            contents=user_prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                max_output_tokens=max_tokens or self.max_tokens,
            ),
        )
        return json.loads(response.text)

    @staticmethod
    def _require_string(payload, key):
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"Expected a non-empty string for '{key}'.")
        return value.strip()

    @classmethod
    def _require_string_list(cls, payload, key, *, max_items=None):
        value = payload.get(key)
        if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
            raise ValueError(f"Expected '{key}' to be a list of non-empty strings.")
        cleaned = [item.strip() for item in value]
        if max_items is not None and len(cleaned) > max_items:
            cleaned = cleaned[:max_items]
        return cleaned

    def _run_or_fallback(self, *, operation_name, call_live, call_fallback):
        try:
            return call_live()
        except Exception as exc:
            logger.warning("Gemini provider fell back during %s: %s", operation_name, exc, exc_info=True)
            try:
                return call_fallback()
            except Exception:
                logger.exception("Deterministic fallback also failed for %s", operation_name)
                raise

    def generate_morning_briefing(self, *, profile, finance_summary, health_summary, top_priorities, blockers_text):
        signals = self.cross_domain_insights(finance_summary=finance_summary, health_summary=health_summary)
        if blockers_text:
            signals.append("A blocker was captured today and should be addressed early.")

        def call_live():
            from core.ai_prompts import build_morning_briefing_request
            request = build_morning_briefing_request(
                profile=profile,
                finance_summary=finance_summary,
                health_summary=health_summary,
                top_priorities=top_priorities,
                blockers_text=blockers_text,
                signals=signals,
            )
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=900,
            )
            return {
                "briefing_text": self._require_string(payload, "briefing_text"),
                "top_priorities": self._require_string_list(payload, "top_priorities", max_items=3),
                "observations": self._require_string_list(payload, "observations", max_items=4),
                "encouragement": self._require_string(payload, "encouragement"),
            }

        return self._run_or_fallback(
            operation_name="generate_morning_briefing",
            call_live=call_live,
            call_fallback=lambda: super(GeminiAIProvider, self).generate_morning_briefing(
                profile=profile,
                finance_summary=finance_summary,
                health_summary=health_summary,
                top_priorities=top_priorities,
                blockers_text=blockers_text,
            ),
        )

    def score_opportunity(self, *, opportunity, active_goal_titles):
        def call_live():
            from core.ai_prompts import build_opportunity_scoring_request
            request = build_opportunity_scoring_request(opportunity=opportunity, active_goal_titles=active_goal_titles)
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=1000,
            )
            fit_score = payload.get("fit_score")
            if not isinstance(fit_score, int) or fit_score < 0 or fit_score > 100:
                raise ValueError("Expected fit_score to be an integer between 0 and 100.")
            return {
                "fit_score": fit_score,
                "fit_reasoning": self._require_string(payload, "fit_reasoning"),
                "proposal_draft": self._require_string(payload, "proposal_draft"),
            }

        return self._run_or_fallback(
            operation_name="score_opportunity",
            call_live=call_live,
            call_fallback=lambda: super(GeminiAIProvider, self).score_opportunity(
                opportunity=opportunity, active_goal_titles=active_goal_titles
            ),
        )

    def generate_weekly_review(self, *, context):
        def call_live():
            from core.ai_prompts import build_weekly_review_request
            request = build_weekly_review_request(context=context)
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=self.max_tokens,
            )
            return self._require_string(payload, "report")

        return self._run_or_fallback(
            operation_name="generate_weekly_review",
            call_live=call_live,
            call_fallback=lambda: super(GeminiAIProvider, self).generate_weekly_review(context=context),
        )

    def analyze_patterns(self, *, overview):
        def call_live():
            from core.ai_prompts import build_pattern_analysis_request
            request = build_pattern_analysis_request(overview=overview)
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=700,
            )
            return self._require_string(payload, "pattern_analysis")

        return self._run_or_fallback(
            operation_name="analyze_patterns",
            call_live=call_live,
            call_fallback=lambda: super(GeminiAIProvider, self).analyze_patterns(overview=overview),
        )

    def summarize_timeline_week(self, *, week_start, week_end, today, days, top_priorities):
        def call_live():
            from core.ai_prompts import build_timeline_week_request
            request = build_timeline_week_request(
                week_start=week_start, week_end=week_end, today=today,
                top_priorities=top_priorities, days=days,
            )
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=self.max_tokens,
            )
            entries = payload.get("days")
            if not isinstance(entries, list):
                raise ValueError("Expected timeline response to contain a days list.")
            note_by_date = {}
            for entry in entries:
                if not isinstance(entry, dict):
                    raise ValueError("Expected each timeline entry to be an object.")
                date_value = self._require_string(entry, "date")
                note_by_date[date_value] = self._require_string(entry, "ai_note")
            expected_dates = [day["date"] for day in days]
            return [{"date": d, "ai_note": note_by_date[d]} for d in expected_dates if d in note_by_date]

        return self._run_or_fallback(
            operation_name="summarize_timeline_week",
            call_live=call_live,
            call_fallback=lambda: super(GeminiAIProvider, self).summarize_timeline_week(
                week_start=week_start, week_end=week_end, today=today,
                days=days, top_priorities=top_priorities,
            ),
        )

    def generate_live_suggestions(self, *, context):
        def call_live():
            from core.ai_prompts import build_ai_suggestions_request  # noqa: PLC0415
            request = build_ai_suggestions_request(context=context)
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=1200,
            )
            items = payload.get("suggestions", [])
            if not isinstance(items, list):
                raise ValueError("Expected suggestions list.")
            result = []
            for item in items[:5]:
                if not isinstance(item, dict):
                    continue
                result.append({
                    "topic": str(item.get("topic", "ai_insight")),
                    "module": str(item.get("module", "analytics")),
                    "text": str(item.get("text", "")).strip(),
                })
            return [s for s in result if s["text"]]

        return self._run_or_fallback(
            operation_name="generate_live_suggestions",
            call_live=call_live,
            call_fallback=lambda: super(GeminiAIProvider, self).generate_live_suggestions(context=context),
        )

    def decompose_node(self, *, node_title, node_type, node_notes, node_why, active_goal_titles):
        def call_live():
            from core.ai_prompts import build_node_decomposition_request  # noqa: PLC0415
            request = build_node_decomposition_request(
                node_title=node_title,
                node_type=node_type,
                node_notes=node_notes,
                node_why=node_why,
                active_goal_titles=active_goal_titles,
            )
            payload = self._request_json(
                system_prompt=request["system"],
                user_prompt=request["user"],
                schema=request["schema"],
                max_tokens=1000,
            )
            items = payload.get("subtasks", [])
            if not isinstance(items, list):
                raise ValueError("Expected subtasks list.")
            result = []
            for item in items[:5]:
                if not isinstance(item, dict):
                    continue
                result.append({
                    "title": str(item.get("title", "")).strip(),
                    "type": str(item.get("type", "task")),
                    "effort": str(item.get("effort", "1h")),
                    "notes": str(item.get("notes", "")).strip(),
                })
            return [s for s in result if s["title"]]

        return self._run_or_fallback(
            operation_name="decompose_node",
            call_live=call_live,
            call_fallback=lambda: super(GeminiAIProvider, self).decompose_node(
                node_title=node_title,
                node_type=node_type,
                node_notes=node_notes,
                node_why=node_why,
                active_goal_titles=active_goal_titles,
            ),
        )
