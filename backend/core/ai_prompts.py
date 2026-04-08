"""Prompt builders and schemas for structured AI responses."""
import json


def _json_payload(data):
    return json.dumps(data, indent=2, sort_keys=True, default=str)


MORNING_BRIEFING_SCHEMA = {
    "type": "object",
    "properties": {
        "briefing_text": {"type": "string"},
        "top_priorities": {"type": "array", "items": {"type": "string"}},
        "observations": {"type": "array", "items": {"type": "string"}},
        "encouragement": {"type": "string"},
    },
    "required": ["briefing_text", "top_priorities", "observations", "encouragement"],
    "additionalProperties": False,
}

OPPORTUNITY_SCORING_SCHEMA = {
    "type": "object",
    "properties": {
        "fit_score": {"type": "integer"},
        "fit_reasoning": {"type": "string"},
        "proposal_draft": {"type": "string"},
    },
    "required": ["fit_score", "fit_reasoning", "proposal_draft"],
    "additionalProperties": False,
}

WEEKLY_REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "report": {"type": "string"},
    },
    "required": ["report"],
    "additionalProperties": False,
}

PATTERN_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "pattern_analysis": {"type": "string"},
    },
    "required": ["pattern_analysis"],
    "additionalProperties": False,
}

TIMELINE_WEEK_SCHEMA = {
    "type": "object",
    "properties": {
        "days": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "date": {"type": "string"},
                    "ai_note": {"type": "string"},
                },
                "required": ["date", "ai_note"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["days"],
    "additionalProperties": False,
}


def build_morning_briefing_request(*, profile, finance_summary, health_summary, top_priorities, blockers_text, signals):
    profile_context = None
    if profile:
        profile_context = {
            "full_name": profile.full_name,
            "location": profile.location,
            "life_focus": profile.life_focus,
            "cognitive_style": profile.cognitive_style,
        }

    context = {
        "profile": profile_context,
        "finance": {
            "independent_income_eur": finance_summary["independent_income_eur"],
            "net_eur": finance_summary["net_eur"],
            "kyrgyzstan_progress_pct": finance_summary["kyrgyzstan_progress_pct"],
        },
        "health": {
            "avg_sleep_7d": health_summary["avg_sleep_7d"],
            "avg_energy_7d": health_summary["avg_energy_7d"],
            "avg_mood_7d": health_summary["avg_mood_7d"],
            "low_sleep_today": health_summary["low_sleep_today"],
            "low_energy_today": health_summary["low_energy_today"],
            "low_mood_today": health_summary["low_mood_today"],
            "low_mood_streak": health_summary["low_mood_streak"],
            "habit_completion_rate_7d": health_summary["habit_completion_rate_7d"],
            "prayer_completion_rate_7d": health_summary["prayer_completion_rate_7d"],
        },
        "top_priorities": top_priorities[:3],
        "signals": signals[:4],
        "blockers_text": blockers_text,
    }
    return {
        "system": (
            "You are Mohamed Badawy's AI operating-system assistant. "
            "Write a grounded morning briefing using only the provided data. "
            "Keep the tone direct, supportive, and specific. "
            "Return JSON only. Keep top_priorities to at most 3 items, "
            "observations to at most 4 short items, and encouragement to one sentence."
        ),
        "user": _json_payload(context),
        "schema": MORNING_BRIEFING_SCHEMA,
    }


def build_opportunity_scoring_request(*, opportunity, active_goal_titles):
    context = {
        "opportunity": {
            "name": opportunity.name,
            "platform": opportunity.platform,
            "description": opportunity.description,
            "budget": str(opportunity.budget) if opportunity.budget is not None else None,
            "status": opportunity.status,
            "date_found": opportunity.date_found.isoformat() if opportunity.date_found else None,
        },
        "active_goal_titles": active_goal_titles,
    }
    return {
        "system": (
            "You evaluate client opportunities for Mohamed. "
            "Score the fit from 0 to 100 as an integer, explain the fit briefly, "
            "and draft a short proposal opening grounded only in the provided context. "
            "Return JSON only."
        ),
        "user": _json_payload(context),
        "schema": OPPORTUNITY_SCORING_SCHEMA,
    }


def build_weekly_review_request(*, context):
    return {
        "system": (
            "You are writing Mohamed's personal weekly review. "
            "Your job: surface honest patterns from the data, not just restate numbers. "
            "Find connections across domains — e.g. 'low sleep correlates with skipped morning blocks', "
            "'prayer completion dropped when pipeline was quiet'. "
            "Be specific and direct. Avoid filler phrases. "
            "Format: start with 'Weekly Review' then use bullet lines. "
            "Include: (1) one headline insight — the most important pattern this week, "
            "(2) health & routine signals, (3) finance & pipeline status, "
            "(4) goals momentum, (5) one honest gap or risk, "
            "(6) one concrete focus for next week. "
            "Use only the supplied context. Return JSON only with one report string."
        ),
        "user": _json_payload(context),
        "schema": WEEKLY_REVIEW_SCHEMA,
    }


def build_pattern_analysis_request(*, overview):
    context = {
        "date": overview["date"],
        "health": {
            "avg_sleep_7d": overview["health"]["avg_sleep_7d"],
            "avg_mood_7d": overview["health"]["avg_mood_7d"],
            "low_energy_today": overview["health"]["low_energy_today"],
            "low_mood_today": overview["health"]["low_mood_today"],
            "habit_completion_rate_7d": overview["health"]["habit_completion_rate_7d"],
            "prayer_completion_rate_7d": overview["health"]["prayer_completion_rate_7d"],
        },
        "finance": overview["finance"],
        "pipeline": overview["pipeline"],
        "counts": overview["counts"],
        "recent_history": overview["history"][:8],
    }
    return {
        "system": (
            "You are writing the analytics pattern-analysis note for Mohamed's personal operating system. "
            "Identify the most important cross-domain pattern from the supplied context. "
            "Return JSON only with one paragraph in pattern_analysis. Keep it to at most 3 sentences."
        ),
        "user": _json_payload(context),
        "schema": PATTERN_ANALYSIS_SCHEMA,
    }


AI_SUGGESTIONS_SCHEMA = {
    "type": "object",
    "properties": {
        "suggestions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "module": {"type": "string"},
                    "text": {"type": "string"},
                },
                "required": ["topic", "module", "text"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["suggestions"],
    "additionalProperties": False,
}

NODE_DECOMPOSITION_SCHEMA = {
    "type": "object",
    "properties": {
        "subtasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "type": {"type": "string"},
                    "effort": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["title", "type", "effort", "notes"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["subtasks"],
    "additionalProperties": False,
}


def build_ai_suggestions_request(*, context):
    return {
        "system": (
            "You are Mohamed Badawy's AI operating-system assistant. "
            "Analyse the 30-day cross-domain data and return 3 to 5 specific, "
            "actionable suggestions. Each suggestion must have: "
            "'topic' (a snake_case tag like 'sleep_recovery', 'pipeline_outreach', 'goals_focus'), "
            "'module' (one of: analytics, health, pipeline, goals, routine), "
            "and 'text' (one direct, concrete sentence — no filler). "
            "Ground every suggestion in the numbers provided. Return JSON only."
        ),
        "user": _json_payload(context),
        "schema": AI_SUGGESTIONS_SCHEMA,
    }


def build_node_decomposition_request(*, node_title, node_type, node_notes, node_why, active_goal_titles):
    context = {
        "node": {
            "title": node_title,
            "type": node_type,
            "notes": node_notes or "",
            "why": node_why or "",
        },
        "active_goal_titles": active_goal_titles[:5],
    }
    return {
        "system": (
            "You are helping Mohamed break down a goal or project into actionable subtasks. "
            "Return 3 to 5 specific child tasks. Each task must have: "
            "'title' (clear action, 5-12 words), "
            "'type' (one of: task, subtask), "
            "'effort' (one of: 15min, 30min, 1h, 2h, 4h, 1day), "
            "'notes' (one sentence of context or empty string). "
            "Be specific to the node provided. Return JSON only."
        ),
        "user": _json_payload(context),
        "schema": NODE_DECOMPOSITION_SCHEMA,
    }


def build_timeline_week_request(*, week_start, week_end, today, top_priorities, days):
    context = {
        "week_start": week_start,
        "week_end": week_end,
        "today": today,
        "top_priorities": top_priorities[:3],
        "days": days,
    }
    return {
        "system": (
            "You are writing one short AI note per day for Mohamed's timeline view. "
            "For past or current days, write a debrief note. For future days, write a prep note. "
            "Use only the provided context. Return JSON only. "
            "You must return exactly one days entry for every input day, using the same date values."
        ),
        "user": _json_payload(context),
        "schema": TIMELINE_WEEK_SCHEMA,
    }
