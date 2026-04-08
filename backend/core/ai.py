"""AI providers used by the structured Personal OS surfaces."""
import json
import logging
from abc import ABC, abstractmethod

from config import settings as project_settings
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


class AIProvider(ABC):
    """Abstract AI boundary for the structured AI surfaces."""

    @abstractmethod
    def generate_morning_briefing(self, *, profile, finance_summary, health_summary, top_priorities, blockers_text):
        """Build the morning briefing payload."""

    @abstractmethod
    def score_opportunity(self, *, opportunity, active_goal_titles):
        """Score an incoming opportunity and draft a lightweight proposal."""

    @abstractmethod
    def generate_weekly_review(self, *, context):
        """Create the weekly review text from assembled context."""

    @abstractmethod
    def cross_domain_insights(self, *, finance_summary, health_summary):
        """Generate deterministic cross-domain flags for dashboard use."""

    @abstractmethod
    def analyze_patterns(self, *, overview):
        """Summarize the strongest cross-domain patterns from the analytics overview."""

    @abstractmethod
    def summarize_timeline_week(self, *, week_start, week_end, today, days, top_priorities):
        """Generate one prep/debrief note per day for a timeline week."""

    @abstractmethod
    def generate_live_suggestions(self, *, context):
        """Generate 3–5 data-grounded suggestions from 30-day cross-domain context."""

    @abstractmethod
    def decompose_node(self, *, node_title, node_type, node_notes, node_why, active_goal_titles):
        """Break a node down into 3–5 specific child task suggestions."""


class DeterministicAIProvider(AIProvider):
    """Rule-driven fallback that keeps API contracts stable before live AI succeeds."""

    def generate_morning_briefing(self, *, profile, finance_summary, health_summary, top_priorities, blockers_text):
        insights = self.cross_domain_insights(
            finance_summary=finance_summary,
            health_summary=health_summary,
        )
        if blockers_text:
            insights.append("A blocker was captured today and should be addressed early.")

        priorities = top_priorities[: 1 if len(insights) >= 2 else 3]
        name = profile.full_name if profile else "Mohamed"
        priority_text = ", ".join(priorities) if priorities else "review the dashboard and capture the next step"
        briefing_text = (
            f"{name}, today's focus is {priority_text}. "
            f"Independent income is at {finance_summary['kyrgyzstan_progress_pct']}% of target."
        )
        if insights:
            briefing_text += f" Key signal: {insights[0]}"

        return {
            "briefing_text": briefing_text,
            "top_priorities": priorities,
            "observations": insights,
            "encouragement": "Keep the system honest: capture reality first, then choose the next useful move.",
        }

    def score_opportunity(self, *, opportunity, active_goal_titles):
        description = (opportunity.description or "").lower()
        score = 45
        reasons = []

        keyword_boosts = {
            "systems": 15,
            "operations": 15,
            "automation": 12,
            "workflow": 10,
            "dashboard": 8,
            "diagnostic": 8,
        }
        for keyword, boost in keyword_boosts.items():
            if keyword in description:
                score += boost
                reasons.append(f"Matched keyword '{keyword}'.")

        if any("income" in title.lower() for title in active_goal_titles):
            score += 5
            reasons.append("Supports the current income goal.")

        if "branding" in description or "logo" in description:
            score -= 10
            reasons.append("Less aligned with operations-focused delivery.")

        score = max(0, min(100, score))
        proposal_draft = (
            f"Hi, I can help with {opportunity.name.lower()} by diagnosing the workflow, "
            "designing the system, and delivering a practical implementation plan."
        )
        return {
            "fit_score": score,
            "fit_reasoning": " ".join(reasons) or "Baseline score until richer profile memory is connected.",
            "proposal_draft": proposal_draft,
        }

    def generate_weekly_review(self, *, context):
        finance = context["finance"]
        health = context["health"]
        schedule = context.get("schedule", {})
        routine = context.get("routine", {})
        habit_rate = (
            f"{health['habit_completion_rate_7d']}%"
            if health["habit_completion_rate_7d"] is not None
            else "n/a"
        )
        prayer_rate = (
            f"{health['prayer_completion_rate_7d']}%"
            if health["prayer_completion_rate_7d"] is not None
            else "n/a"
        )
        routine_line = ""
        if routine.get("completion_pct") is not None:
            routine_line = f"- Routine completion this week: {routine['completion_pct']}%"
            if routine.get("top_skipped_blocks"):
                routine_line += f" | Most skipped: {', '.join(routine['top_skipped_blocks'][:2])}"

        honest_assessment = "This week was mainly about rebuilding momentum from the current constraints."
        if health.get("low_mood_streak", 0) >= 2:
            honest_assessment = (
                "Capacity was constrained by a repeated low-mood stretch, so the week needed gentler pacing."
            )
        if (
            health.get("habit_completion_rate_7d") is not None
            and health["habit_completion_rate_7d"] < 50
        ):
            honest_assessment += " Core habits slipped below the baseline, which made the system noisier."
        schedule_line = "- Schedule friction: no repeated skipped blocks detected."
        if schedule.get("repeated_skips"):
            top_skip = schedule["repeated_skips"][0]
            schedule_line = (
                f"- Schedule friction: {top_skip['label']} was skipped {top_skip['count']} times this week"
            )
        lines = [
            "Weekly Review",
            f"- Independent income this month: EUR {finance['independent_income_eur']}",
            f"- Net this month: EUR {finance['net_eur']}",
            f"- Avg sleep (7d): {health['avg_sleep_7d']}",
            f"- Avg mood (7d): {health['avg_mood_7d']}",
            f"- Habit completion (7d): {habit_rate}",
            f"- Prayer completion (7d): {prayer_rate}",
        ]
        if routine_line:
            lines.append(routine_line)
        lines.extend([schedule_line, f"- Honest assessment: {honest_assessment}"])
        return "\n".join(lines)

    def cross_domain_insights(self, *, finance_summary, health_summary):
        insights = []
        if health_summary["low_sleep_today"]:
            insights.append("Sleep was low today, so deep-focus work should stay limited.")
        if health_summary["low_energy_today"]:
            insights.append("Energy is low today; lighter tasks should move to the front.")
        if health_summary.get("low_mood_streak", 0) >= 2:
            insights.append("Mood has been low for multiple days, so protect capacity before pushing harder.")
        if (
            health_summary.get("habit_completion_rate_7d") is not None
            and health_summary["habit_completion_rate_7d"] < 50
        ):
            insights.append("Habit follow-through is under 50% this week, so re-anchor the basics first.")
        if (
            health_summary.get("prayer_gap_streak", 0) >= 2
            or (
                health_summary.get("spiritual_consistency_7d") is not None
                and health_summary["spiritual_consistency_7d"] < 50
            )
        ):
            insights.append("Spiritual consistency has dipped, so keep the morning anchor gentle and real.")
        if finance_summary["kyrgyzstan_progress_pct"] < 100:
            insights.append("The Kyrgyzstan trigger is still open, so income-generating work stays highest leverage.")
        return insights

    def analyze_patterns(self, *, overview):
        insights = []
        health = overview["health"]
        finance = overview["finance"]
        pipeline = overview["pipeline"]
        counts = overview["counts"]

        if health["avg_sleep_7d"] is not None and health["avg_sleep_7d"] < 6.5:
            insights.append("Sleep is running below a stable baseline, which is likely compressing capacity.")
        if health.get("low_mood_streak", 0) >= 2:
            insights.append(
                "Mood has stayed low across multiple days, so the system should bias toward recovery and narrower commitments."
            )
        if (
            health.get("habit_completion_rate_7d") is not None
            and health["habit_completion_rate_7d"] < 50
        ):
            insights.append("Habit follow-through is slipping, which usually makes work feel heavier than it is.")
        if finance["kyrgyzstan_progress_pct"] < 100:
            insights.append(
                "Independent income is still the main leverage point, so work that directly advances clients or offers should win ties."
            )
        if pipeline["empty_pipeline"]:
            insights.append("The pipeline is thin enough that marketing and outreach need to stay visible this week.")
        elif pipeline["due_follow_ups_count"] > 0:
            insights.append("There are due follow-ups in the pipeline, so closing loops may be higher value than starting new threads.")
        if counts["achievements"] > 0 and counts["marketing_actions"] == 0:
            insights.append(
                "Achievement memory exists, but recent marketing evidence is light, so visibility may be lagging behind capability."
            )

        if not insights:
            return (
                "The cross-domain picture looks relatively steady right now. "
                "Keep the system honest with daily capture and let the main income goal keep steering tradeoffs."
            )

        return " ".join(insights[:3])

    def generate_live_suggestions(self, *, context):
        """Rule-based fallback that produces grounded suggestions from context."""
        suggestions = []
        health = context.get("health", {})
        finance = context.get("finance", {})
        pipeline = context.get("pipeline", {})
        routine = context.get("routine", {})
        goals = context.get("goals", {})

        if health.get("avg_sleep_7d") is not None and health["avg_sleep_7d"] < 6.5:
            suggestions.append({
                "topic": "sleep_recovery",
                "module": "health",
                "text": f"Average sleep is {health['avg_sleep_7d']}h over 7 days — protect a consistent 7h window to recover baseline capacity.",
            })
        if health.get("habit_completion_rate_7d") is not None and health["habit_completion_rate_7d"] < 60:
            suggestions.append({
                "topic": "habit_reset",
                "module": "health",
                "text": f"Habit follow-through is at {health['habit_completion_rate_7d']}% — pick one anchor habit and protect it above all others this week.",
            })
        if pipeline.get("empty_pipeline"):
            suggestions.append({
                "topic": "pipeline_outreach",
                "module": "pipeline",
                "text": "The active pipeline is empty — block one hour today to research and capture one new opportunity.",
            })
        elif pipeline.get("due_follow_ups_count", 0) > 0:
            suggestions.append({
                "topic": "pipeline_follow_up",
                "module": "pipeline",
                "text": f"{pipeline['due_follow_ups_count']} follow-up(s) are due — close at least one pipeline loop before end of day.",
            })
        if finance.get("kyrgyzstan_progress_pct") is not None and finance["kyrgyzstan_progress_pct"] < 100:
            suggestions.append({
                "topic": "income_focus",
                "module": "analytics",
                "text": f"Independent income is at {finance['kyrgyzstan_progress_pct']}% of target — prioritise income-generating work over internal projects this week.",
            })
        if goals.get("stalled_nodes", 0) >= 3:
            suggestions.append({
                "topic": "goals_focus",
                "module": "goals",
                "text": f"{goals['stalled_nodes']} nodes haven't been updated in 14+ days — archive or reactivate them to keep the system honest.",
            })
        if routine.get("completion_pct_30d") is not None and routine["completion_pct_30d"] < 60:
            suggestions.append({
                "topic": "routine_rebuild",
                "module": "routine",
                "text": f"30-day routine completion is {routine['completion_pct_30d']}% — simplify the block list to what you can actually protect.",
            })
        return suggestions[:5]

    def decompose_node(self, *, node_title, node_type, node_notes, node_why, active_goal_titles):
        """Rule-based fallback decomposition — returns generic but useful child tasks."""
        return [
            {
                "title": f"Research and define scope for: {node_title}",
                "type": "task",
                "effort": "1h",
                "notes": "Clarify the exact deliverable before starting execution.",
            },
            {
                "title": f"Draft a first version or prototype",
                "type": "task",
                "effort": "2h",
                "notes": "Get something concrete on paper — imperfect is fine.",
            },
            {
                "title": f"Review and iterate on first draft",
                "type": "task",
                "effort": "1h",
                "notes": "Apply one round of improvements based on the initial output.",
            },
            {
                "title": f"Share or deliver the result",
                "type": "task",
                "effort": "30min",
                "notes": "Close the loop — send, publish, or hand off the finished item.",
            },
        ]

    def _summarize_day(self, *, context, is_future):
        if is_future:
            top_priorities = ", ".join(context.get("top_priorities", [])[:2]) or "one useful next step"
            note = f"Keep the fixed anchors intact and protect room for {top_priorities}."
            if context.get("reduced_mode"):
                note += " Reduced mode is active, so resist overfilling the day."
            if context.get("due_follow_ups_count"):
                note += " There are follow-ups due, so reserve one block for closing loops."
            return note

        observations = []
        if context.get("health"):
            health = context["health"]
            observations.append(
                f"Body data landed at sleep {health['sleep_hours']}h and energy {health['energy_level']}/5."
            )
        else:
            observations.append("Body data was not captured, so the day is harder to interpret cleanly.")

        if context.get("mood"):
            observations.append(f"Mood was logged at {context['mood']['mood_score']}/5.")
        if context.get("prayers_count") is not None:
            observations.append(f"Spiritual anchor held at {context['prayers_count']}/5 prayers.")
        if context.get("habit_count"):
            observations.append(f"{context['habit_count']} habits were marked done.")
        if context.get("marketing_count"):
            observations.append("Some outward momentum was logged through marketing or follow-up activity.")
        if context.get("achievement_count"):
            observations.append("There was a concrete win recorded, which is worth keeping visible.")

        if not context.get("health") and not context.get("mood"):
            observations.append("The main lesson is probably to capture more reality before trying to optimize the pattern.")

        return " ".join(observations[:3])

    def summarize_timeline_week(self, *, week_start, week_end, today, days, top_priorities):
        return [
            {
                "date": day["date"],
                "ai_note": self._summarize_day(
                    context={**day["context"], "top_priorities": top_priorities},
                    is_future=day["is_future"],
                ),
            }
            for day in days
        ]


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


def get_ai_provider():
    """Return the currently configured AI provider."""
    config = project_settings.get_ai_runtime_config()
    if config["provider"] == "gemini" and config.get("gemini_api_key"):
        return GeminiAIProvider(
            api_key=config["gemini_api_key"],
            model=config["gemini_model"],
            max_tokens=config["gemini_max_tokens"],
        )
    if config["provider"] == "anthropic" and config["api_key"]:
        return AnthropicAIProvider(
            api_key=config["api_key"],
            model=config["model"],
            timeout_seconds=config["timeout_seconds"],
            max_tokens=config["max_tokens"],
        )
    return DeterministicAIProvider()
