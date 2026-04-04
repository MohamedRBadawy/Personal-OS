"""Closure services for project and opportunity retrospectives."""
from analytics.models.project_retrospective import ProjectRetrospective


class ProjectRetrospectiveService:
    """Create or update retrospectives when work closes."""

    @classmethod
    def capture_for_opportunity(cls, opportunity):
        """Persist a retrospective for a closed opportunity."""
        if opportunity.status not in {"won", "lost", "rejected"} or not opportunity.date_closed:
            return None

        summary = opportunity.outcome_notes or opportunity.fit_reasoning or "Opportunity closed."
        return ProjectRetrospective.objects.update_or_create(
            opportunity=opportunity,
            defaults={
                "title": opportunity.name,
                "source_type": ProjectRetrospective.SourceType.OPPORTUNITY,
                "status": opportunity.status,
                "summary": summary,
                "what_worked": opportunity.proposal_draft or "",
                "what_didnt": "" if opportunity.status == "won" else "Opportunity did not convert.",
                "next_time": "Review the opportunity pattern and sharpen the next proposal.",
                "closed_at": opportunity.date_closed,
            },
        )[0]

    @classmethod
    def capture_for_node(cls, node):
        """Persist a retrospective for a completed project node."""
        if node.type != "project" or node.status != "done" or not node.completed_at:
            return None

        return ProjectRetrospective.objects.update_or_create(
            goal_node=node,
            defaults={
                "title": node.title,
                "source_type": ProjectRetrospective.SourceType.PROJECT,
                "status": node.status,
                "summary": node.notes or "Project closed from the goal map.",
                "what_worked": "Dependency chain was completed enough to mark this project done.",
                "what_didnt": "",
                "next_time": "Capture a cleaner checklist or process before the next similar project starts.",
                "closed_at": node.completed_at.date(),
            },
        )[0]
