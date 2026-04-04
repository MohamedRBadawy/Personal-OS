"""Pipeline lifecycle rules, summaries, and workspace read models."""
from django.db import transaction
from django.utils import timezone

from analytics.models.achievement import Achievement
from analytics.models.decision_log import DecisionLog
from analytics.services import ProjectRetrospectiveService
from core.ai import get_ai_provider
from finance.models import FinanceEntry
from finance.services import FinanceMetricsService
from goals.models import Node
from pipeline.models import Client, MarketingAction, Opportunity


class OpportunityLifecycleService:
    """Handles AI defaults and cross-domain side effects for opportunities."""

    @staticmethod
    def _active_goal_titles():
        return list(
            Node.objects.filter(type=Node.NodeType.GOAL).values_list("title", flat=True),
        )

    @classmethod
    def enrich(cls, opportunity):
        """Populate deterministic AI fields when they are empty."""
        ai_provider = get_ai_provider()
        ai_result = ai_provider.score_opportunity(
            opportunity=opportunity,
            active_goal_titles=cls._active_goal_titles(),
        )

        changed_fields = []
        for field in ("fit_score", "fit_reasoning", "proposal_draft"):
            if not getattr(opportunity, field):
                setattr(opportunity, field, ai_result[field])
                changed_fields.append(field)

        if changed_fields:
            opportunity.save(update_fields=[*changed_fields, "updated_at"])

    @classmethod
    @transaction.atomic
    def handle_status_change(cls, opportunity, previous_status=None):
        """Create the downstream records for won and lost opportunities."""
        if previous_status == opportunity.status:
            return

        if opportunity.status in {Opportunity.Status.WON, Opportunity.Status.LOST} and not opportunity.date_closed:
            opportunity.date_closed = timezone.localdate()
            opportunity.save(update_fields=["date_closed", "updated_at"])

        if opportunity.status == Opportunity.Status.WON:
            Client.objects.get_or_create(
                opportunity=opportunity,
                defaults={
                    "name": opportunity.name,
                    "source_platform": opportunity.platform,
                },
            )
            if opportunity.budget:
                FinanceEntry.objects.get_or_create(
                    type=FinanceEntry.EntryType.INCOME,
                    source=f"Client: {opportunity.name}",
                    date=opportunity.date_closed,
                    defaults={
                        "amount": opportunity.budget,
                        "currency": FinanceEntry.Currency.EUR,
                        "is_independent": True,
                        "is_recurring": False,
                        "notes": "Created automatically from a won opportunity.",
                    },
                )
            MarketingAction.objects.get_or_create(
                action=f"Won client {opportunity.name}",
                platform=opportunity.platform,
                date=opportunity.date_closed,
                defaults={"result": "Opportunity converted into a client."},
            )
            Achievement.objects.get_or_create(
                title=f"Won client: {opportunity.name}",
                domain="Client Pipeline",
                date=opportunity.date_closed,
                defaults={"notes": "Generated automatically from a won opportunity."},
            )
            FinanceMetricsService.sync_goal_status()

        if opportunity.status == Opportunity.Status.LOST:
            DecisionLog.objects.get_or_create(
                decision=f"Lost opportunity: {opportunity.name}",
                date=opportunity.date_closed,
                defaults={
                    "reasoning": "Debrief prompt: What could have been stronger in the proposal?",
                    "outcome": opportunity.outcome_notes,
                },
            )

        if opportunity.status in {Opportunity.Status.WON, Opportunity.Status.LOST, Opportunity.Status.REJECTED}:
            ProjectRetrospectiveService.capture_for_opportunity(opportunity)

    @classmethod
    def summary(cls):
        """Return a frontend-friendly opportunity tracker summary."""
        today = timezone.localdate()
        last_application = Opportunity.objects.exclude(date_applied__isnull=True).order_by("-date_applied").first()
        due_follow_ups = MarketingAction.objects.filter(
            follow_up_done=False,
            follow_up_date__lte=today,
        ).count()
        return {
            "new_or_reviewing_count": Opportunity.objects.filter(
                status__in=[Opportunity.Status.NEW, Opportunity.Status.REVIEWING],
            ).count(),
            "applied_count": Opportunity.objects.filter(status=Opportunity.Status.APPLIED).count(),
            "won_count": Opportunity.objects.filter(status=Opportunity.Status.WON).count(),
            "lost_count": Opportunity.objects.filter(status=Opportunity.Status.LOST).count(),
            "empty_pipeline": not Opportunity.objects.filter(
                status__in=[Opportunity.Status.NEW, Opportunity.Status.REVIEWING],
            ).exists(),
            "days_since_last_application": (
                (today - last_application.date_applied).days if last_application else None
            ),
            "due_follow_ups_count": due_follow_ups,
        }


class PipelineWorkspaceService:
    """Build the frontend workspace payload for pipeline and follow-ups."""

    @staticmethod
    def _serialize_opportunity(opportunity):
        return {
            "id": str(opportunity.id),
            "name": opportunity.name,
            "platform": opportunity.platform,
            "description": opportunity.description,
            "budget": str(opportunity.budget) if opportunity.budget is not None else None,
            "status": opportunity.status,
            "fit_score": opportunity.fit_score,
            "fit_reasoning": opportunity.fit_reasoning,
            "proposal_draft": opportunity.proposal_draft,
            "date_found": opportunity.date_found.isoformat(),
            "date_applied": opportunity.date_applied.isoformat() if opportunity.date_applied else None,
            "date_closed": opportunity.date_closed.isoformat() if opportunity.date_closed else None,
            "outcome_notes": opportunity.outcome_notes,
        }

    @staticmethod
    def _serialize_marketing(action):
        return {
            "id": str(action.id),
            "action": action.action,
            "platform": action.platform,
            "result": action.result,
            "follow_up_date": action.follow_up_date.isoformat() if action.follow_up_date else None,
            "follow_up_done": action.follow_up_done,
            "date": action.date.isoformat(),
            "goal": str(action.goal_id) if action.goal_id else None,
        }

    @staticmethod
    def _serialize_client(client):
        return {
            "id": str(client.id),
            "name": client.name,
            "source_platform": client.source_platform,
            "opportunity": str(client.opportunity_id) if client.opportunity_id else None,
            "notes": client.notes,
        }

    @classmethod
    def payload(cls, reference_date=None):
        """Return a richer pipeline workspace payload."""
        reference_date = reference_date or timezone.localdate()
        active_statuses = [
            Opportunity.Status.NEW,
            Opportunity.Status.REVIEWING,
            Opportunity.Status.APPLIED,
        ]
        recent_outcome_statuses = [
            Opportunity.Status.WON,
            Opportunity.Status.LOST,
            Opportunity.Status.REJECTED,
        ]
        active_opportunities = list(
            Opportunity.objects.filter(status__in=active_statuses).order_by("-date_found", "name"),
        )
        recent_outcomes = list(
            Opportunity.objects.filter(status__in=recent_outcome_statuses).order_by("-date_closed", "-date_found")[:6],
        )
        due_follow_ups = list(
            MarketingAction.objects.filter(
                follow_up_done=False,
                follow_up_date__lte=reference_date,
            ).order_by("follow_up_date", "-date")[:8],
        )
        recent_clients = list(Client.objects.order_by("-created_at")[:5])
        return {
            "date": reference_date.isoformat(),
            "summary": OpportunityLifecycleService.summary(),
            "active_opportunities": [cls._serialize_opportunity(item) for item in active_opportunities],
            "recent_outcomes": [cls._serialize_opportunity(item) for item in recent_outcomes],
            "due_follow_ups": [cls._serialize_marketing(item) for item in due_follow_ups],
            "recent_clients": [cls._serialize_client(item) for item in recent_clients],
        }


class WorkOverviewService:
    """Build the grouped work and career workspace payload."""

    @staticmethod
    def _serialize_task(node):
        from core.services import PriorityService

        return PriorityService.serialize_priority(node, timezone.localdate())

    @classmethod
    def payload(cls, reference_date=None):
        """Return grouped work data across tasks, pipeline, and marketing."""
        reference_date = reference_date or timezone.localdate()
        task_nodes = list(
            Node.objects.select_related("parent").prefetch_related("deps", "dependents").filter(
                type__in=[Node.NodeType.PROJECT, Node.NodeType.TASK, Node.NodeType.SUB_TASK],
                status__in=[Node.Status.ACTIVE, Node.Status.AVAILABLE, Node.Status.BLOCKED],
            ),
        )
        deadlines = sorted(
            [node for node in task_nodes if node.due_date],
            key=lambda item: (item.due_date, item.status, item.created_at),
        )[:8]
        marketing_actions = list(MarketingAction.objects.order_by("-date")[:8])
        opportunities = PipelineWorkspaceService.payload(reference_date)
        proposal_drafts = [
            item for item in opportunities["active_opportunities"]
            if item.get("proposal_draft")
        ]
        return {
            "date": reference_date.isoformat(),
            "summary": {
                "active_task_count": sum(1 for node in task_nodes if node.status in {Node.Status.ACTIVE, Node.Status.AVAILABLE}),
                "blocked_task_count": sum(1 for node in task_nodes if node.status == Node.Status.BLOCKED),
                "deadline_count": len(deadlines),
                "proposal_draft_count": len(proposal_drafts),
                "due_follow_ups_count": opportunities["summary"]["due_follow_ups_count"],
                "active_opportunity_count": opportunities["summary"]["new_or_reviewing_count"],
            },
            "task_board": [cls._serialize_task(node) for node in task_nodes[:10]],
            "deadlines": [cls._serialize_task(node) for node in deadlines],
            "pipeline": opportunities,
            "marketing_actions": [
                PipelineWorkspaceService._serialize_marketing(item)
                for item in marketing_actions
            ],
            "proposal_drafts": proposal_drafts,
        }
