"""Goals/nodes-domain tool schemas and executors for the AI chat agent."""
import logging

from django.utils import timezone

from goals.models import Node
from goals.services import NodeStatusService

logger = logging.getLogger(__name__)

SCHEMAS = [
    {
        "name": "create_node",
        "description": "Create a goal, project, task, idea, or burden in the life plan.",
        "input_schema": {
            "type": "object",
            "required": ["title", "type"],
            "properties": {
                "title": {"type": "string"},
                "type": {"type": "string", "enum": ["goal", "project", "task", "sub_task", "idea", "burden"]},
                "category": {"type": "string", "enum": ["Career", "Finance", "Health", "Spiritual", "Family", "Learning", "Personal", "Life"]},
                "notes": {"type": "string"},
                "parent_title": {"type": "string", "description": "Title of the parent node to nest under"},
            },
        },
    },
    {
        "name": "update_node_status",
        "description": "Mark a goal/task/project as done, active, or blocked.",
        "input_schema": {
            "type": "object",
            "required": ["title", "status"],
            "properties": {
                "title": {"type": "string", "description": "Partial or full node title"},
                "status": {"type": "string", "enum": ["active", "available", "blocked", "done"]},
            },
        },
    },
    {
        "name": "update_node_notes",
        "description": "Update the notes or details on an existing goal, project, or task.",
        "input_schema": {
            "type": "object",
            "required": ["title", "notes"],
            "properties": {
                "title": {"type": "string", "description": "Partial or full title of the goal/project/task"},
                "notes": {"type": "string"},
            },
        },
    },
    {
        "name": "update_goal_progress",
        "description": "Set progress percentage on a goal, project, or task found by partial title.",
        "input_schema": {
            "type": "object",
            "required": ["title", "progress_pct"],
            "properties": {
                "title": {"type": "string", "description": "Partial or full node title"},
                "progress_pct": {"type": "number", "minimum": 0, "maximum": 100},
            },
        },
    },
]


def create_node(inputs: dict) -> dict:
    parent = None
    if inputs.get("parent_title"):
        parent = Node.objects.filter(title__icontains=inputs["parent_title"]).first()
    node = Node.objects.create(
        title=inputs["title"],
        type=inputs["type"],
        category=inputs.get("category", ""),
        notes=inputs.get("notes", ""),
        parent=parent,
    )
    NodeStatusService.refresh_all()
    return {"status": "created", "id": str(node.id), "title": node.title, "type": node.type}


def update_node_status(inputs: dict) -> dict:
    node = Node.objects.filter(title__icontains=inputs["title"]).first()
    if not node:
        return {"error": f"No node found matching '{inputs['title']}'"}
    new_status = inputs["status"]
    node.status = new_status
    if new_status == Node.Status.DONE:
        node.completed_at = timezone.now()
    else:
        node.completed_at = None
    node.save()
    NodeStatusService.refresh_all()
    return {"status": "updated", "title": node.title, "new_status": new_status}


def update_node_notes(inputs: dict) -> dict:
    title = inputs.get("title", "")
    node = Node.objects.filter(title__icontains=title).first()
    if not node:
        return {"error": f"No goal/task found matching '{title}'"}
    node.notes = inputs["notes"]
    node.save()
    return {"status": "updated", "title": node.title, "notes_length": len(node.notes)}


def update_goal_progress(inputs: dict) -> dict:
    title = inputs.get("title", "")
    node = Node.objects.filter(title__icontains=title).first()
    if not node:
        return {"error": f"No goal/task found matching '{title}'"}
    progress = max(0, min(100, int(inputs["progress_pct"])))
    node.progress = progress
    node.save()
    return {"status": "updated", "title": node.title, "progress_pct": progress}


EXECUTORS = {
    "create_node": create_node,
    "update_node_status": update_node_status,
    "update_node_notes": update_node_notes,
    "update_goal_progress": update_goal_progress,
}
