"""Contacts-domain tool schemas and executors for the AI chat agent."""
from django.utils.dateparse import parse_date

from contacts.models import Contact


SCHEMAS = [
    {
        "name": "update_contact_followup",
        "description": "Set the next follow-up date for a contact found by partial name.",
        "input_schema": {
            "type": "object",
            "required": ["name", "next_followup"],
            "properties": {
                "name": {"type": "string", "description": "Partial or full contact name"},
                "next_followup": {"type": "string", "description": "ISO date, e.g. 2026-04-25"},
                "notes": {"type": "string"},
            },
        },
    },
]


def update_contact_followup(inputs: dict) -> dict:
    name = inputs.get("name", "")
    contact = Contact.objects.filter(name__icontains=name).first()
    if not contact:
        return {"error": f"No contact found matching '{name}'"}
    followup_date = parse_date(inputs["next_followup"])
    if not followup_date:
        return {"error": "next_followup must be an ISO date"}
    contact.next_followup = followup_date
    if inputs.get("notes"):
        contact.notes = inputs["notes"]
    contact.save()
    return {"status": "updated", "contact": contact.name, "next_followup": contact.next_followup.isoformat()}


EXECUTORS = {
    "update_contact_followup": update_contact_followup,
}
