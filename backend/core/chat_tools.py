"""Compatibility shim — re-exports TOOL_SCHEMAS and execute_tool.

All logic has been split into domain modules under core/tools/:
  core/tools/health.py    — health, mood, spiritual, habit tools
  core/tools/goals.py     — node create/update tools
  core/tools/finance.py   — finance entry tool
  core/tools/pipeline.py  — opportunity, marketing, follow-up tools
  core/tools/analytics.py — idea, achievement, decision tools
  core/tools/schedule.py  — schedule block logging tool

Existing imports such as ``from core.chat_tools import TOOL_SCHEMAS, execute_tool``
continue to work unchanged.
"""
import logging

from core.tools import analytics, contacts, finance, goals, health, journal, pipeline, schedule

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tool schemas — assembled from all domain modules
# ---------------------------------------------------------------------------

TOOL_SCHEMAS = (
    health.SCHEMAS
    + goals.SCHEMAS
    + journal.SCHEMAS
    + finance.SCHEMAS
    + pipeline.SCHEMAS
    + contacts.SCHEMAS
    + analytics.SCHEMAS
    + schedule.SCHEMAS
)

# ---------------------------------------------------------------------------
# Unified executor registry
# ---------------------------------------------------------------------------

_EXECUTORS: dict = {
    **health.EXECUTORS,
    **goals.EXECUTORS,
    **journal.EXECUTORS,
    **finance.EXECUTORS,
    **pipeline.EXECUTORS,
    **contacts.EXECUTORS,
    **analytics.EXECUTORS,
    **schedule.EXECUTORS,
}


def execute_tool(name: str, inputs: dict) -> dict:
    """Dispatch a tool call to the correct executor. Returns a result dict."""
    executor = _EXECUTORS.get(name)
    if not executor:
        return {"error": f"Unknown tool: {name}"}
    try:
        return executor(inputs)
    except Exception as exc:
        logger.exception("Tool %s failed: %s", name, exc)
        return {"error": str(exc)}
