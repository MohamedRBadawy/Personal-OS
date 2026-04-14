"""Prompt builders and schemas for structured AI responses."""
import json


def _json_payload(data):
    return json.dumps(data, indent=2, sort_keys=True, default=str)


# ── Rich profile context ───────────────────────────────────────────────────────

def build_rich_profile_context() -> str:
    """Build a Mohamed-specific context block for injection into any AI prompt.

    Reads: profile.UserProfile, ProfileSection, AppSettings.
    Returns a structured text block that makes every AI call specific to
    Mohamed's actual situation rather than generic life-coach advice.
    Falls back to a safe static summary if the DB is unavailable.
    """
    try:
        from profile.models import ProfileSection, UserProfile  # noqa: PLC0415

        user_profile = UserProfile.get_or_create_singleton()
        sections = list(ProfileSection.objects.filter(profile=user_profile).order_by("order"))

        # Core identity
        name             = user_profile.full_name or "Mohamed"
        personality      = user_profile.personality_type or "INTP"
        religion         = user_profile.religion or "Muslim"
        location         = user_profile.location or "Cairo, Egypt"

        # Finance
        independent_income = float(user_profile.monthly_independent_income or 0)
        target             = float(user_profile.financial_target_monthly or 1000)
        currency           = user_profile.financial_target_currency or "EUR"
        debt               = float(user_profile.total_debt or 33150)
        debt_currency      = user_profile.debt_currency or "EGP"
        pct                = round((independent_income / target) * 100) if target > 0 else 0
        employment_income  = float(user_profile.monthly_income or 700)

        lines = [
            "## About Mohamed",
            f"Name: {name} | Personality: {personality} | Faith: {religion}",
            f"Location: {location} | 5 children (ages ~10, 8, 5, 2, <1)",
            "",
            "## The One Goal (North Star)",
            f"Reach {currency} {int(target)}/mo of INDEPENDENT income → move family to Kyrgyzstan.",
            f"Current independent income: {currency} {independent_income:.0f}/mo ({pct}% of target).",
            f"Employment (K Line Europe, remote): {currency} {employment_income:.0f}/mo — stable but not independent.",
            f"Total debt: {debt:,.0f} {debt_currency} across 5 creditors. Target: cleared July 2026.",
            "",
            "## Service Business",
            "Operations Clarity Audit — operational diagnostics for small businesses.",
            f"Pricing: {currency} 150 (first 2 clients) → {currency} 300+. Methodology written. Portfolio: Sandton case study.",
            "LinkedIn: 500+ connections. Profile still positioned as employee — needs reframing.",
            "Equity partnerships in progress (~20% each): perfumes + laptops (both operational systems).",
            "",
            "## Key Constraints",
            "• Cannot afford an income gap — K Line is the only safety net for 5 children.",
            "• Expack failure (2018–2022): built without planning first. Root cause: instinct over structure.",
            "• Pattern he is consciously replacing: skip planning → build → hope for good outcome.",
            "• INTP: diagnoses multiple layers simultaneously, executes fast — wants external pushback before full commitment.",
            "• Living environment: Cairo, area he dislikes. Marsa Matrouh or Kyrgyzstan is the target.",
        ]

        # Append user-written ProfileSections (capped at 5 to stay within token budget)
        meaningful = [s for s in sections if s.content.strip()][:5]
        if meaningful:
            lines.append("")
            lines.append("## Mohamed's Own Notes (from profile)")
            for section in meaningful:
                lines.append(f"### {section.title}")
                lines.append(section.content[:500].strip())

        return "\n".join(lines)

    except Exception:  # noqa: BLE001
        # Safe fallback — always returns something useful
        return (
            "Mohamed Badawy, INTP, Muslim, Cairo, 5 children. "
            "Target: €1,000/mo independent income → move to Kyrgyzstan. "
            "Current independent income: €0. Employment: €700/mo (K Line Europe). "
            "Service: Operations Clarity Audit (€150–300+). "
            "Debt: 33,150 EGP. Expack failure history — now building with structured approach."
        )


# ── JSON Schemas ───────────────────────────────────────────────────────────────

MORNING_BRIEFING_SCHEMA = {
    "type": "object",
    "properties": {
        "briefing_text":      {"type": "string"},
        "top_priorities":     {"type": "array", "items": {"type": "string"}},
        "observations":       {"type": "array", "items": {"type": "string"}},
        "encouragement":      {"type": "string"},
        "honest_challenge":   {"type": "string"},
        "commitment_prompt":  {"type": "string"},
    },
    "required": [
        "briefing_text", "top_priorities", "observations",
        "encouragement", "honest_challenge", "commitment_prompt",
    ],
    "additionalProperties": False,
}

OPPORTUNITY_SCORING_SCHEMA = {
    "type": "object",
    "properties": {
        "fit_score":      {"type": "integer"},
        "fit_reasoning":  {"type": "string"},
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
                    "date":    {"type": "string"},
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

AI_SUGGESTIONS_SCHEMA = {
    "type": "object",
    "properties": {
        "suggestions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "topic":  {"type": "string"},
                    "module": {"type": "string"},
                    "text":   {"type": "string"},
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
                    "title":  {"type": "string"},
                    "type":   {"type": "string"},
                    "effort": {"type": "string"},
                    "notes":  {"type": "string"},
                },
                "required": ["title", "type", "effort", "notes"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["subtasks"],
    "additionalProperties": False,
}

OUTREACH_DRAFT_SCHEMA = {
    "type": "object",
    "properties": {
        "draft":    {"type": "string"},
        "subject":  {"type": "string"},
        "tip":      {"type": "string"},
    },
    "required": ["draft", "subject", "tip"],
    "additionalProperties": False,
}


# ── Prompt builders ────────────────────────────────────────────────────────────

def build_morning_briefing_request(*, profile, finance_summary, health_summary, top_priorities, blockers_text, signals):
    """Morning briefing — now includes honest_challenge and commitment_prompt."""
    rich_context = build_rich_profile_context()

    context = {
        "finance": {
            "independent_income_eur":   finance_summary["independent_income_eur"],
            "net_eur":                  finance_summary["net_eur"],
            "kyrgyzstan_progress_pct":  finance_summary["kyrgyzstan_progress_pct"],
        },
        "health": {
            "avg_sleep_7d":              health_summary["avg_sleep_7d"],
            "avg_energy_7d":             health_summary["avg_energy_7d"],
            "avg_mood_7d":               health_summary["avg_mood_7d"],
            "low_sleep_today":           health_summary["low_sleep_today"],
            "low_energy_today":          health_summary["low_energy_today"],
            "low_mood_today":            health_summary["low_mood_today"],
            "low_mood_streak":           health_summary["low_mood_streak"],
            "habit_completion_rate_7d":  health_summary["habit_completion_rate_7d"],
            "prayer_completion_rate_7d": health_summary["prayer_completion_rate_7d"],
        },
        "top_priorities": top_priorities[:3],
        "signals":        signals[:4],
        "blockers_text":  blockers_text,
    }
    return {
        "system": (
            f"{rich_context}\n\n"
            "You are Mohamed's AI operating-system assistant. "
            "Write a grounded morning briefing using ONLY the provided data. "
            "Tone: direct, supportive, specific — not generic life-coach. "
            "Reference his actual situation (Kyrgyzstan goal, K Line income, debt, service business). "
            "Return JSON only.\n"
            "• briefing_text: 2–3 sentences grounded in today's numbers\n"
            "• top_priorities: at most 3 items (actual node titles if provided)\n"
            "• observations: at most 4 short cross-domain signals (e.g. 'Sleep 5.5h → likely low energy')\n"
            "• encouragement: one sentence — concrete, not motivational-poster\n"
            "• honest_challenge: one uncomfortable truth from the data (e.g. 'Pipeline empty 6 days — no outreach logged')\n"
            "• commitment_prompt: one question for him to answer now (e.g. 'What is the ONE action before noon?')"
        ),
        "user":   _json_payload(context),
        "schema": MORNING_BRIEFING_SCHEMA,
    }


def build_opportunity_scoring_request(*, opportunity, active_goal_titles):
    rich_context = build_rich_profile_context()
    context = {
        "opportunity": {
            "name":        opportunity.name,
            "platform":    opportunity.platform,
            "description": opportunity.description,
            "budget":      str(opportunity.budget) if opportunity.budget is not None else None,
            "status":      opportunity.status,
            "date_found":  opportunity.date_found.isoformat() if opportunity.date_found else None,
        },
        "active_goal_titles": active_goal_titles,
    }
    return {
        "system": (
            f"{rich_context}\n\n"
            "You evaluate client opportunities for Mohamed. "
            "Score the fit from 0 to 100 as an integer based on how well this opportunity "
            "aligns with his Operations Clarity Audit service, his income target, and his skills. "
            "Explain the fit briefly (2 sentences max). "
            "Draft a short, specific proposal opening for the platform (LinkedIn/Upwork/email). "
            "Return JSON only."
        ),
        "user":   _json_payload(context),
        "schema": OPPORTUNITY_SCORING_SCHEMA,
    }


def build_weekly_review_request(*, context):
    rich_context = build_rich_profile_context()
    return {
        "system": (
            f"{rich_context}\n\n"
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
            "Reference his actual north star (Kyrgyzstan, €1,000/mo target) where relevant. "
            "Use only the supplied context. Return JSON only with one report string."
        ),
        "user":   _json_payload(context),
        "schema": WEEKLY_REVIEW_SCHEMA,
    }


def build_pattern_analysis_request(*, overview):
    rich_context = build_rich_profile_context()
    context = {
        "date": overview["date"],
        "health": {
            "avg_sleep_7d":              overview["health"]["avg_sleep_7d"],
            "avg_mood_7d":               overview["health"]["avg_mood_7d"],
            "low_energy_today":          overview["health"]["low_energy_today"],
            "low_mood_today":            overview["health"]["low_mood_today"],
            "habit_completion_rate_7d":  overview["health"]["habit_completion_rate_7d"],
            "prayer_completion_rate_7d": overview["health"]["prayer_completion_rate_7d"],
        },
        "finance":         overview["finance"],
        "pipeline":        overview["pipeline"],
        "counts":          overview["counts"],
        "recent_history":  overview["history"][:8],
    }
    return {
        "system": (
            f"{rich_context}\n\n"
            "You are writing the analytics pattern-analysis note for Mohamed's personal OS. "
            "Identify the most important cross-domain pattern from the supplied context. "
            "Reference his actual goal (Kyrgyzstan readiness, €1,000/mo) where the data is relevant. "
            "Return JSON only with one paragraph in pattern_analysis. Keep it to at most 3 sentences. "
            "Be specific — name actual numbers and what they mean for his north-star goal."
        ),
        "user":   _json_payload(context),
        "schema": PATTERN_ANALYSIS_SCHEMA,
    }


def build_ai_suggestions_request(*, context):
    rich_context = build_rich_profile_context()
    return {
        "system": (
            f"{rich_context}\n\n"
            "You are Mohamed's AI operating-system assistant. "
            "Analyse the 30-day cross-domain data and return 3 to 5 specific, actionable suggestions. "
            "Each suggestion must have: "
            "'topic' (snake_case tag e.g. 'sleep_recovery', 'pipeline_outreach', 'debt_payment'), "
            "'module' (one of: analytics, health, pipeline, goals, routine, finance), "
            "and 'text' (one direct, concrete sentence — reference his actual situation, not generic advice). "
            "Good example: 'Debt is 33,150 EGP and surplus is 16,500/mo — allocate full surplus to Tante Amora this month to clear first.' "
            "Bad example: 'Consider paying off your debts to improve financial health.' "
            "Ground every suggestion in the numbers provided. Return JSON only."
        ),
        "user":   _json_payload(context),
        "schema": AI_SUGGESTIONS_SCHEMA,
    }


def build_node_decomposition_request(*, node_title, node_type, node_notes, node_why, active_goal_titles):
    rich_context = build_rich_profile_context()
    context = {
        "node": {
            "title":  node_title,
            "type":   node_type,
            "notes":  node_notes or "",
            "why":    node_why or "",
        },
        "active_goal_titles": active_goal_titles[:5],
    }
    return {
        "system": (
            f"{rich_context}\n\n"
            "You are helping Mohamed break down a goal or project into actionable subtasks. "
            "Return 3 to 5 specific child tasks. Each task must have: "
            "'title' (clear action verb + object, 5–12 words), "
            "'type' (one of: task, subtask), "
            "'effort' (one of: 15min, 30min, 1h, 2h, 4h, 1day), "
            "'notes' (one sentence of concrete context or empty string). "
            "Be specific to THIS node — reference his Operations Audit service or Kyrgyzstan path where relevant. "
            "Return JSON only."
        ),
        "user":   _json_payload(context),
        "schema": NODE_DECOMPOSITION_SCHEMA,
    }


def build_timeline_week_request(*, week_start, week_end, today, top_priorities, days):
    context = {
        "week_start":      week_start,
        "week_end":        week_end,
        "today":           today,
        "top_priorities":  top_priorities[:3],
        "days":            days,
    }
    return {
        "system": (
            "You are writing one short AI note per day for Mohamed's timeline view. "
            "For past or current days, write a debrief note (what mattered, what the data says). "
            "For future days, write a prep note (what to focus on, what to prepare). "
            "Use only the provided context. Return JSON only. "
            "You must return exactly one days entry for every input day, using the same date values."
        ),
        "user":   _json_payload(context),
        "schema": TIMELINE_WEEK_SCHEMA,
    }


def build_outreach_draft_request(*, opportunity, service_offer, channel_instructions, profile_context):
    """Build a rich outreach draft request for a specific pipeline opportunity."""
    rich_context = build_rich_profile_context()
    context = {
        "opportunity": {
            "name":             opportunity.name,
            "platform":         opportunity.platform,
            "description":      opportunity.description,
            "budget":           str(opportunity.budget) if opportunity.budget else None,
            "prospect_context": getattr(opportunity, "prospect_context", "") or "",
            "outreach_count":   getattr(opportunity, "outreach_count", 0),
        },
        "service_offer":        service_offer,
        "channel_instructions": channel_instructions,
    }
    return {
        "system": (
            f"{rich_context}\n\n"
            "You are drafting an outreach message for Mohamed's Operations Clarity Audit service. "
            "Write a specific, non-generic message for the given platform. "
            "Use the prospect context to make the opening specific to THEM. "
            "Keep it under 150 words. Do not use filler openers ('I hope this finds you well'). "
            "Return JSON only with:\n"
            "• draft: the full message text\n"
            "• subject: subject line (for email) or message header (for LinkedIn/Upwork)\n"
            "• tip: one specific thing to do before sending (e.g. 'Check their last LinkedIn post first')"
        ),
        "user":   _json_payload(context),
        "schema": OUTREACH_DRAFT_SCHEMA,
    }
