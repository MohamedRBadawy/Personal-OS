"""Pipeline-domain tool schemas and executors for the AI chat agent."""
import logging
from datetime import date

from pipeline.models import MarketingAction, Opportunity
from pipeline.services import OpportunityLifecycleService

logger = logging.getLogger(__name__)

SCHEMAS = [
    {
        "name": "add_opportunity",
        "description": "Add a new freelance opportunity to the pipeline.",
        "input_schema": {
            "type": "object",
            "required": ["name", "platform"],
            "properties": {
                "name": {"type": "string"},
                "platform": {"type": "string", "enum": ["Upwork", "Freelancer", "Referral", "Direct", "Other"]},
                "description": {"type": "string"},
                "budget": {"type": "number"},
            },
        },
    },
    {
        "name": "log_marketing_action",
        "description": "Record a marketing or visibility action with optional follow-up context.",
        "input_schema": {
            "type": "object",
            "required": ["action", "platform"],
            "properties": {
                "action": {"type": "string"},
                "platform": {"type": "string"},
                "result": {"type": "string"},
            },
        },
    },
    {
        "name": "update_opportunity_status",
        "description": "Update the status of a pipeline opportunity (e.g. mark it applied, won, or lost).",
        "input_schema": {
            "type": "object",
            "required": ["name", "status"],
            "properties": {
                "name": {"type": "string", "description": "Partial or full opportunity name"},
                "status": {"type": "string", "enum": ["new", "reviewing", "applied", "won", "lost", "rejected"]},
                "outcome_notes": {"type": "string"},
            },
        },
    },
    {
        "name": "mark_followup_done",
        "description": "Mark a marketing or pipeline follow-up as completed.",
        "input_schema": {
            "type": "object",
            "required": ["action_text"],
            "properties": {
                "action_text": {"type": "string", "description": "Partial or full text of the marketing action to mark done"},
            },
        },
    },
]


def add_opportunity(inputs: dict) -> dict:
    opp = Opportunity.objects.create(
        name=inputs["name"],
        platform=inputs["platform"],
        description=inputs.get("description", ""),
        budget=inputs.get("budget"),
        date_found=date.today(),
    )
    OpportunityLifecycleService.enrich(opp)
    return {"status": "created", "id": str(opp.id), "name": opp.name}


def log_marketing_action(inputs: dict) -> dict:
    action = MarketingAction.objects.create(
        action=inputs["action"],
        platform=inputs["platform"],
        result=inputs.get("result", ""),
        date=date.today(),
    )
    return {"status": "recorded", "id": str(action.id), "action": action.action}


def update_opportunity_status(inputs: dict) -> dict:
    name = inputs.get("name", "")
    opp = Opportunity.objects.filter(name__icontains=name).first()
    if not opp:
        return {"error": f"No opportunity found matching '{name}'"}
    opp.status = inputs["status"]
    if inputs.get("outcome_notes"):
        opp.outcome_notes = inputs["outcome_notes"]
    opp.save()
    if inputs["status"] in {"won", "lost", "rejected"}:
        from analytics.services import ProjectRetrospectiveService
        ProjectRetrospectiveService.maybe_create_for_opportunity(opp)
    return {"status": "updated", "opportunity": opp.name, "new_status": opp.status}


def mark_followup_done(inputs: dict) -> dict:
    action_text = inputs.get("action_text", "")
    action = MarketingAction.objects.filter(
        action__icontains=action_text, follow_up_done=False,
    ).first()
    if not action:
        return {"error": f"No pending follow-up found matching '{action_text}'"}
    action.follow_up_done = True
    action.save()
    return {"status": "marked done", "action": action.action, "date": str(action.date)}


EXECUTORS = {
    "add_opportunity": add_opportunity,
    "log_marketing_action": log_marketing_action,
    "update_opportunity_status": update_opportunity_status,
    "mark_followup_done": mark_followup_done,
}
