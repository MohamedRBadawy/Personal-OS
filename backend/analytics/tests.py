"""Tests for analytics rules and signal discipline."""
import os
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework import serializers
from rest_framework.test import APIClient

from analytics.models.ai_suggestion import AISuggestion
from analytics.models.achievement import Achievement
from analytics.models.decision_log import DecisionLog
from analytics.models.idea import Idea
from analytics.models.learning import Learning
from analytics.models.project_retrospective import ProjectRetrospective
from analytics.models.weekly_review import WeeklyReview
from analytics.services import OverwhelmService
from core.services.command_center import CommandCenterService
from finance.models import FinanceEntry
from core.models import DailyCheckIn
from goals.models import Node
from health.models.health_log import HealthLog
from health.models.habit import Habit, HabitLog
from health.models.mood_log import MoodLog
from health.models.spiritual_log import SpiritualLog
from pipeline.models import MarketingAction, Opportunity


class AnalyticsRuleTests(TestCase):
    """Coverage for overwhelm detection and AI signal discipline."""

    def test_overwhelm_reduced_mode_triggers(self):
        today = timezone.localdate()
        DailyCheckIn.objects.create(date=today)
        for offset in (0, 1):
            HealthLog.objects.create(
                date=today - timedelta(days=offset),
                sleep_hours="5.0",
                sleep_quality=2,
                energy_level=2,
                exercise_done=False,
            )
            MoodLog.objects.create(
                date=today - timedelta(days=offset),
                mood_score=2,
            )

        summary = OverwhelmService.summary(today)
        self.assertTrue(summary["reduced_mode"])
        self.assertGreaterEqual(summary["overwhelm_score"], 4)

    def test_fourth_ignored_suggestion_is_blocked(self):
        topic = "outreach"
        module = "today"
        today = timezone.now()
        for weeks_ago in (4, 3, 2):
            suggestion = AISuggestion.objects.create(
                topic=topic,
                module=module,
                suggestion_text=f"Suggestion {weeks_ago}",
                acted_on=False,
            )
            AISuggestion.objects.filter(pk=suggestion.pk).update(
                shown_at=today - timedelta(days=weeks_ago * 7),
            )

        serializer = serializers.Serializer()
        with self.assertRaises(Exception):
            from analytics.services import AISuggestionDisciplineService

            AISuggestionDisciplineService.validate(topic=topic, module=module)


class AnalyticsReadModelTests(TestCase):
    """Coverage for analytics overview and timeline endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_review_commitments_flow_into_prior_commitments_and_command_center(self):
        today = timezone.localdate()
        prior_week_start = today - timedelta(days=today.weekday() + 7)
        prior_review = WeeklyReview.objects.create(
            week_start=prior_week_start,
            week_end=prior_week_start + timedelta(days=6),
            ai_report="Prior week review",
        )
        node = Node.objects.create(
            title="Publish one useful update",
            type=Node.NodeType.TASK,
            status=Node.Status.AVAILABLE,
        )

        create_response = self.client.post(
            f"/api/analytics/reviews/{prior_review.id}/commitments/",
            [
                {
                    "action_type": "start",
                    "description": "Write one public learning note.",
                    "node_update": str(node.id),
                },
            ],
            format="json",
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data[0]["node_update_title"], "Publish one useful update")

        due_response = self.client.get("/api/analytics/reviews/prior-commitments/")

        self.assertEqual(due_response.status_code, 200)
        self.assertEqual(len(due_response.data), 1)
        self.assertEqual(due_response.data[0]["description"], "Write one public learning note.")
        self.assertEqual(due_response.data[0]["from_week"], prior_week_start.isoformat())

        with patch("core.services.command_center.get_ai_provider") as provider_factory:
            provider_factory.return_value.generate_morning_briefing.return_value = {"briefing_text": "", "observations": []}
            with patch("analytics.services.reviews.WeeklyReviewService.preview") as preview:
                preview.return_value = {
                    "week_start": today - timedelta(days=today.weekday()),
                    "week_end": today - timedelta(days=today.weekday()) + timedelta(days=6),
                    "report": "Current week preview",
                    "context": {},
                }
                payload = CommandCenterService.payload(today)

        self.assertEqual(len(payload["prior_commitments_due"]), 1)
        commitment_id = create_response.data[0]["id"]
        self.assertEqual(payload["prior_commitments_due"][0]["id"], commitment_id)

        patch_response = self.client.patch(
            f"/api/analytics/reviews/commitments/{commitment_id}/",
            {"was_kept": True},
            format="json",
        )

        self.assertEqual(patch_response.status_code, 200)
        self.assertTrue(patch_response.data["was_kept"])
        self.assertEqual(self.client.get("/api/analytics/reviews/prior-commitments/").data, [])

    def test_decisions_due_endpoint_returns_pending_tradeoff_reviews(self):
        today = timezone.localdate()
        enabled = Node.objects.create(
            title="Build independent income engine",
            type=Node.NodeType.GOAL,
            status=Node.Status.ACTIVE,
        )
        killed = Node.objects.create(
            title="Polish low-leverage admin",
            type=Node.NodeType.GOAL,
            status=Node.Status.DEFERRED,
        )
        due_decision = DecisionLog.objects.create(
            decision="Prioritize outreach before internal cleanup",
            reasoning="Income movement matters more this week.",
            trade_off_cost="Delay admin polish.",
            outcome_date=today - timedelta(days=1),
            outcome_result="",
            enabled_node=enabled,
            killed_node=killed,
            date=today - timedelta(days=7),
        )
        DecisionLog.objects.create(
            decision="Reviewed decision",
            reasoning="Already judged.",
            outcome_date=today - timedelta(days=1),
            outcome_result="right",
            date=today - timedelta(days=6),
        )

        response = self.client.get("/api/analytics/decisions/due/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(due_decision.id))
        self.assertEqual(response.data[0]["trade_off_cost"], "Delay admin polish.")
        self.assertEqual(response.data[0]["enabled_node_title"], "Build independent income engine")
        self.assertEqual(response.data[0]["killed_node_title"], "Polish low-leverage admin")

    def test_overview_endpoint_returns_cross_domain_payload(self):
        today = timezone.localdate()
        HealthLog.objects.create(
            date=today,
            sleep_hours="7.0",
            sleep_quality=4,
            energy_level=3,
            exercise_done=True,
            exercise_type="Walk",
        )
        MoodLog.objects.create(date=today, mood_score=3, notes="Steady")
        SpiritualLog.objects.create(
            date=today,
            fajr=True,
            dhuhr=True,
            asr=False,
            maghrib=True,
            isha=False,
            quran_pages=4,
            dhikr_done=True,
        )
        habit = Habit.objects.create(name="Cold shower", target=Habit.Target.DAILY)
        HabitLog.objects.create(habit=habit, date=today, done=True)
        FinanceEntry.objects.create(
            date=today,
            type=FinanceEntry.EntryType.INCOME,
            source="Freelance Client",
            amount="250.00",
            currency=FinanceEntry.Currency.EUR,
            is_independent=True,
        )
        MarketingAction.objects.create(
            action="Follow up with a lead",
            platform="LinkedIn",
            date=today,
            result="Awaiting reply",
        )
        Opportunity.objects.create(
            name="Warm Upwork lead",
            platform=Opportunity.Platform.UPWORK,
            status=Opportunity.Status.REVIEWING,
            date_found=today,
        )
        Idea.objects.create(title="Telegram reminder idea", context="Useful later")
        DecisionLog.objects.create(decision="Ship backend first", reasoning="Stabilize contracts", date=today)
        Achievement.objects.create(title="Shipped dashboard", domain="Work", date=today)

        response = self.client.get("/api/analytics/overview/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["date"], today.isoformat())
        self.assertIn("pattern_analysis", response.data)
        self.assertGreaterEqual(response.data["counts"]["ideas"], 1)
        self.assertGreaterEqual(len(response.data["history"]), 1)

    def test_timeline_endpoint_returns_week_payload(self):
        today = timezone.localdate()
        HealthLog.objects.create(
            date=today,
            sleep_hours="6.5",
            sleep_quality=3,
            energy_level=3,
            exercise_done=False,
        )
        MoodLog.objects.create(date=today, mood_score=3, notes="Focused")
        DecisionLog.objects.create(
            decision="Stay narrow on priorities",
            reasoning="Avoid overload",
            date=today,
        )

        week_start = today - timedelta(days=today.weekday())
        response = self.client.get(f"/api/analytics/timeline/?week_start={week_start.isoformat()}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["week_start"], week_start.isoformat())
        self.assertEqual(len(response.data["days"]), 7)
        today_payload = next(item for item in response.data["days"] if item["date"] == today.isoformat())
        self.assertIn("ai_note", today_payload)
        self.assertIsInstance(today_payload["detail_rows"], list)

    def test_generate_review_endpoint_creates_and_updates_same_week(self):
        today = timezone.localdate()

        first_response = self.client.post("/api/analytics/reviews/generate/")

        self.assertEqual(first_response.status_code, 201)
        review_id = first_response.data["review"]["id"]
        self.assertEqual(WeeklyReview.objects.count(), 1)

        WeeklyReview.objects.filter(pk=review_id).update(personal_notes="Keep the next week narrower.")

        second_response = self.client.post("/api/analytics/reviews/generate/")

        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(WeeklyReview.objects.count(), 1)
        self.assertEqual(second_response.data["review"]["id"], review_id)
        self.assertEqual(second_response.data["review"]["personal_notes"], "Keep the next week narrower.")
        self.assertEqual(second_response.data["preview"]["week_end"], (today - timedelta(days=today.weekday()) + timedelta(days=6)).isoformat())

    def test_timeline_overview_endpoint_returns_achievements_retrospectives_and_archived_goals(self):
        today = timezone.localdate()
        Achievement.objects.create(title="Shipped command center", domain="Work", date=today)
        done_project = Node.objects.create(
            title="Stabilize MVP",
            type=Node.NodeType.PROJECT,
            category=Node.Category.CAREER,
            status=Node.Status.DONE,
        )
        ProjectRetrospective.objects.create(
            title="Closed project reflection",
            source_type=ProjectRetrospective.SourceType.PROJECT,
            goal_node=done_project,
            status="done",
            summary="The project closed cleanly.",
            what_worked="Strong scoping.",
            what_didnt="Polish came late.",
            next_time="Validate the UX sooner.",
            closed_at=today,
        )

        response = self.client.get("/api/timeline/overview/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("weekly_review", response.data)
        self.assertIn("pattern_analysis", response.data)
        self.assertEqual(len(response.data["achievements"]), 1)
        self.assertEqual(len(response.data["retrospectives"]), 1)
        self.assertEqual(len(response.data["archived_goals"]), 1)

    def test_ideas_overview_endpoint_returns_grouped_idea_decision_and_learning_data(self):
        today = timezone.localdate()
        Idea.objects.create(title="Telegram reminder idea", context="Useful later")
        DecisionLog.objects.create(decision="Ship backend first", reasoning="Stabilize contracts", date=today)
        Learning.objects.create(
            topic="Django service design",
            source="Internal implementation",
            status=Learning.Status.IN_PROGRESS,
            key_insights="Keep orchestration in services.",
        )

        response = self.client.get("/api/ideas/overview/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["raw_ideas"], 1)
        self.assertEqual(response.data["summary"]["decisions"], 1)
        self.assertEqual(response.data["summary"]["learning_items"], 1)
        self.assertEqual(len(response.data["ideas"]), 1)
        self.assertEqual(len(response.data["decisions"]), 1)
        self.assertEqual(len(response.data["learning"]), 1)

    def test_suggestion_actions_update_state(self):
        suggestion = AISuggestion.objects.create(
            topic="pipeline_follow_up",
            module="pipeline",
            suggestion_text="Close one loop today.",
        )

        act_response = self.client.post(f"/api/analytics/suggestions/{suggestion.id}/act/")

        self.assertEqual(act_response.status_code, 200)
        suggestion.refresh_from_db()
        self.assertTrue(suggestion.acted_on)
        self.assertIsNone(suggestion.dismissed_at)

        dismiss_response = self.client.post(f"/api/analytics/suggestions/{suggestion.id}/dismiss/")

        self.assertEqual(dismiss_response.status_code, 200)
        suggestion.refresh_from_db()
        self.assertFalse(suggestion.acted_on)
        self.assertIsNotNone(suggestion.dismissed_at)

    @patch("core.ai.AnthropicAIProvider._request_json")
    def test_live_ai_review_generation_keeps_contract(self, request_json):
        request_json.return_value = {
            "report": "Weekly Review\n- Live AI summary grounded in the current data.",
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
            response = self.client.post("/api/analytics/reviews/generate/")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["review"]["ai_report"], "Weekly Review\n- Live AI summary grounded in the current data.")
        self.assertEqual(response.data["preview"]["report"], "Weekly Review\n- Live AI summary grounded in the current data.")

    @patch("core.ai.AnthropicAIProvider._request_json")
    def test_live_ai_outputs_can_flow_through_overview_and_timeline(self, request_json):
        today = timezone.localdate()
        HealthLog.objects.create(
            date=today,
            sleep_hours="6.5",
            sleep_quality=3,
            energy_level=3,
            exercise_done=False,
        )
        MoodLog.objects.create(date=today, mood_score=3, notes="Focused")

        week_start = today - timedelta(days=today.weekday())
        request_json.side_effect = [
            {"pattern_analysis": "Live AI says sleep and outreach rhythm are moving together this week."},
            {
                "days": [
                    {"date": (week_start + timedelta(days=index)).isoformat(), "ai_note": f"Live note {index}"}
                    for index in range(7)
                ],
            },
        ]
        with patch.dict(
            os.environ,
            {
                "AI_PROVIDER": "anthropic",
                "ANTHROPIC_API_KEY": "test-key",
                "ANTHROPIC_MODEL": "claude-sonnet-4-6",
            },
            clear=True,
        ):
            overview_response = self.client.get("/api/analytics/overview/")
            timeline_response = self.client.get(f"/api/analytics/timeline/?week_start={week_start.isoformat()}")

        self.assertEqual(overview_response.status_code, 200)
        self.assertEqual(
            overview_response.data["pattern_analysis"],
            "Live AI says sleep and outreach rhythm are moving together this week.",
        )
        self.assertEqual(timeline_response.status_code, 200)
        self.assertEqual(timeline_response.data["days"][0]["ai_note"], "Live note 0")
        self.assertEqual(len(timeline_response.data["days"]), 7)
