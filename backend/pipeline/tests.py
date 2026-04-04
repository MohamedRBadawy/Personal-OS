"""Tests for opportunity lifecycle side effects."""
import os
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from analytics.models.achievement import Achievement
from analytics.models.decision_log import DecisionLog
from analytics.models.project_retrospective import ProjectRetrospective
from finance.models import FinanceEntry
from goals.models import Node
from pipeline.models import Client, MarketingAction, Opportunity
from pipeline.services import OpportunityLifecycleService


class OpportunityLifecycleTests(TestCase):
    """Coverage for won and lost opportunity automation."""

    def test_won_opportunity_creates_related_records(self):
        opportunity = Opportunity.objects.create(
            name="Operations System Overhaul",
            platform=Opportunity.Platform.UPWORK,
            description="Need systems and workflow automation support.",
            budget=Decimal("1200.00"),
            status=Opportunity.Status.WON,
            date_found=timezone.localdate(),
        )

        OpportunityLifecycleService.enrich(opportunity)
        OpportunityLifecycleService.handle_status_change(opportunity)

        self.assertTrue(Client.objects.filter(opportunity=opportunity).exists())
        self.assertTrue(FinanceEntry.objects.filter(source="Client: Operations System Overhaul").exists())
        self.assertTrue(MarketingAction.objects.filter(action__icontains="Won client").exists())
        self.assertTrue(Achievement.objects.filter(title__icontains="Won client").exists())

    def test_lost_opportunity_creates_decision_log(self):
        opportunity = Opportunity.objects.create(
            name="Lost Deal",
            platform=Opportunity.Platform.DIRECT,
            status=Opportunity.Status.LOST,
            date_found=timezone.localdate(),
        )

        OpportunityLifecycleService.handle_status_change(opportunity)
        self.assertTrue(DecisionLog.objects.filter(decision__icontains="Lost opportunity").exists())

    def test_closed_opportunity_creates_retrospective_record(self):
        opportunity = Opportunity.objects.create(
            name="Closed Deal",
            platform=Opportunity.Platform.DIRECT,
            status=Opportunity.Status.WON,
            budget=Decimal("500.00"),
            date_found=timezone.localdate(),
        )

        OpportunityLifecycleService.handle_status_change(opportunity)

        self.assertTrue(ProjectRetrospective.objects.filter(opportunity=opportunity).exists())


class PipelineWorkspaceTests(TestCase):
    """Coverage for the pipeline workspace read model endpoint."""

    def setUp(self):
        self.client = APIClient()

    def test_workspace_endpoint_returns_active_pipeline_payload(self):
        today = timezone.localdate()
        opportunity = Opportunity.objects.create(
            name="Warm Upwork lead",
            platform=Opportunity.Platform.UPWORK,
            status=Opportunity.Status.REVIEWING,
            date_found=today,
            budget=Decimal("450.00"),
        )
        MarketingAction.objects.create(
            action="Follow up with warm LinkedIn lead",
            platform="LinkedIn",
            date=today,
            follow_up_date=today,
            follow_up_done=False,
        )
        Client.objects.create(name="Existing client", source_platform="Direct", opportunity=opportunity)

        response = self.client.get("/api/pipeline/workspace/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["date"], today.isoformat())
        self.assertEqual(len(response.data["active_opportunities"]), 1)
        self.assertEqual(response.data["summary"]["new_or_reviewing_count"], 1)
        self.assertEqual(len(response.data["due_follow_ups"]), 1)
        self.assertEqual(len(response.data["recent_clients"]), 1)

    def test_marketing_follow_up_completion_updates_workspace_summary(self):
        today = timezone.localdate()
        action = MarketingAction.objects.create(
            action="Follow up with warm LinkedIn lead",
            platform="LinkedIn",
            date=today,
            follow_up_date=today,
            follow_up_done=False,
        )

        patch_response = self.client.patch(
            f"/api/pipeline/marketing/{action.id}/",
            {"follow_up_done": True},
            format="json",
        )
        workspace_response = self.client.get("/api/pipeline/workspace/")

        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(workspace_response.status_code, 200)
        self.assertEqual(workspace_response.data["summary"]["due_follow_ups_count"], 0)
        self.assertEqual(len(workspace_response.data["due_follow_ups"]), 0)

    def test_work_overview_endpoint_returns_grouped_payload(self):
        today = timezone.localdate()
        goal = Node.objects.create(
            title="Reach independent income target",
            type=Node.NodeType.GOAL,
            category=Node.Category.FINANCE,
            status=Node.Status.ACTIVE,
        )
        Node.objects.create(
            title="Build command center backend",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
            parent=goal,
            due_date=today,
            manual_priority=Node.ManualPriority.HIGH,
            notes="API and backend implementation work.",
        )
        Opportunity.objects.create(
            name="Warm Upwork lead",
            platform=Opportunity.Platform.UPWORK,
            status=Opportunity.Status.REVIEWING,
            proposal_draft="Draft proposal",
            date_found=today,
        )
        MarketingAction.objects.create(
            action="Follow up with warm LinkedIn lead",
            platform="LinkedIn",
            date=today,
            follow_up_date=today,
            follow_up_done=False,
        )

        response = self.client.get("/api/work/overview/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("summary", response.data)
        self.assertIn("task_board", response.data)
        self.assertIn("deadlines", response.data)
        self.assertIn("proposal_drafts", response.data)
        self.assertEqual(response.data["summary"]["deadline_count"], 1)
        self.assertEqual(response.data["summary"]["proposal_draft_count"], 1)

    @patch("core.ai.AnthropicAIProvider._request_json")
    def test_live_ai_enriches_opportunity_on_create(self, request_json):
        today = timezone.localdate()
        request_json.return_value = {
            "fit_score": 88,
            "fit_reasoning": "Strong match for systems and dashboard work.",
            "proposal_draft": "I can turn this into a clean diagnostic and implementation workflow.",
        }
        with patch.dict(
            os.environ,
            {
                "AI_PROVIDER": "anthropic",
                "ANTHROPIC_API_KEY": "test-key",
                "ANTHROPIC_MODEL": "claude-sonnet-4-6",
            },
            clear=True,
        ):
            response = self.client.post(
                "/api/pipeline/opportunities/",
                {
                    "name": "Operations Dashboard Lead",
                    "platform": Opportunity.Platform.UPWORK,
                    "description": "Need systems, workflow, and dashboard help.",
                    "status": Opportunity.Status.NEW,
                    "date_found": today.isoformat(),
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        opportunity = Opportunity.objects.get(name="Operations Dashboard Lead")
        self.assertEqual(opportunity.fit_score, 88)
        self.assertEqual(opportunity.fit_reasoning, "Strong match for systems and dashboard work.")
        self.assertEqual(
            opportunity.proposal_draft,
            "I can turn this into a clean diagnostic and implementation workflow.",
        )
