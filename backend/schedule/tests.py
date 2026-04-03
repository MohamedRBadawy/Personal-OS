"""Tests for schedule read models and weekly review inputs."""
from datetime import time, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from analytics.services import WeeklyReviewService
from goals.models import Node
from health.models.health_log import HealthLog
from pipeline.models import MarketingAction
from schedule.models import ScheduleBlock, ScheduleLog, ScheduleTemplate


class ScheduleTodayTests(TestCase):
    """Coverage for the schedule daily read model and validation."""

    def setUp(self):
        self.client = APIClient()
        self.template = ScheduleTemplate.objects.create(name="Primary Day", is_active=True)
        self.fixed_block = ScheduleBlock.objects.create(
            template=self.template,
            time=time(hour=5, minute=0),
            label="Morning anchor",
            type=ScheduleBlock.BlockType.SPIRITUAL,
            is_fixed=True,
            duration_mins=30,
            is_adjustable=False,
            sort_order=10,
        )
        self.work_block = ScheduleBlock.objects.create(
            template=self.template,
            time=time(hour=9, minute=0),
            label="Focused work",
            type=ScheduleBlock.BlockType.WORK,
            is_fixed=False,
            duration_mins=90,
            is_adjustable=True,
            sort_order=20,
        )
        self.marketing_block = ScheduleBlock.objects.create(
            template=self.template,
            time=time(hour=13, minute=0),
            label="Marketing",
            type=ScheduleBlock.BlockType.MARKETING,
            is_fixed=False,
            duration_mins=45,
            is_adjustable=True,
            sort_order=30,
        )
        self.project = Node.objects.create(
            title="Launch service",
            type=Node.NodeType.PROJECT,
            category=Node.Category.CAREER,
            status=Node.Status.ACTIVE,
        )
        self.task = Node.objects.create(
            title="Write scope outline",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
            parent=self.project,
        )

    def test_today_endpoint_returns_active_template_and_suggestions(self):
        response = self.client.get("/api/schedule/today/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["template"]["name"], "Primary Day")
        self.assertEqual(len(response.data["blocks"]), 3)
        work_block = next(block for block in response.data["blocks"] if block["type"] == "work")
        self.assertEqual(work_block["suggestion"]["kind"], "goal_node")
        self.assertEqual(work_block["suggestion"]["goal_node"]["title"], "Launch service")

    def test_today_endpoint_prefers_lighter_work_when_low_energy(self):
        HealthLog.objects.create(
            date=timezone.localdate(),
            sleep_hours="5.5",
            sleep_quality=2,
            energy_level=2,
            exercise_done=False,
            exercise_type="",
        )

        response = self.client.get("/api/schedule/today/")

        self.assertEqual(response.status_code, 200)
        work_block = next(block for block in response.data["blocks"] if block["type"] == "work")
        self.assertEqual(work_block["suggestion"]["goal_node"]["title"], "Write scope outline")
        self.assertIn("lighter available work item", work_block["suggestion_reason"])

    def test_today_endpoint_surfaces_due_marketing_follow_up(self):
        MarketingAction.objects.create(
            action="Follow up on proposal",
            platform="LinkedIn",
            goal=self.project,
            result="Pending",
            follow_up_date=timezone.localdate(),
            follow_up_done=False,
            date=timezone.localdate() - timedelta(days=2),
        )

        response = self.client.get("/api/schedule/today/")

        self.assertEqual(response.status_code, 200)
        marketing_block = next(block for block in response.data["blocks"] if block["type"] == "marketing")
        self.assertEqual(marketing_block["suggestion"]["kind"], "marketing_follow_up")
        self.assertEqual(marketing_block["suggestion"]["marketing_action"]["action"], "Follow up on proposal")
        self.assertEqual(response.data["summary"]["due_follow_ups_count"], 1)

    def test_schedule_log_serializer_rejects_duplicate_block_entries(self):
        ScheduleLog.objects.create(
            date=timezone.localdate(),
            block=self.work_block,
            task_node=self.task,
            status=ScheduleLog.LogStatus.DONE,
        )

        response = self.client.post(
            "/api/schedule/logs/",
            {
                "date": timezone.localdate().isoformat(),
                "block": str(self.work_block.id),
                "task_node": str(self.task.id),
                "status": ScheduleLog.LogStatus.SKIPPED,
                "note": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Only one schedule log is allowed", str(response.data))

    def test_weekly_review_preview_includes_repeated_skips(self):
        for days_ago in range(3):
            ScheduleLog.objects.create(
                date=timezone.localdate() - timedelta(days=days_ago),
                block=self.marketing_block,
                status=ScheduleLog.LogStatus.SKIPPED,
            )

        preview = WeeklyReviewService.preview()

        self.assertTrue(preview["context"]["schedule"]["repeated_skips"])
        self.assertIn("Marketing was skipped 3 times", preview["report"])
