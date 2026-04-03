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
            "You are generating a weekly review narrative for Mohamed's personal operating system. "
            "Use only the supplied context. Return JSON only with one report string. "
            "The report must start with 'Weekly Review' and then continue as concise bullet-style lines "
            "inside the same string. Keep it concrete, honest, and cross-domain."
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
