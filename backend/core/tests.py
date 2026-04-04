"""Tests for core orchestration flows."""
import os
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from analytics.models.ai_suggestion import AISuggestion
from analytics.models.idea import Idea
from config import settings as project_settings
from core.ai import AnthropicAIProvider, DeterministicAIProvider, get_ai_provider
from core.models import AppSettings, DailyCheckIn, Profile
from finance.models import FinanceEntry
from finance.services import FinanceMetricsService
from goals.models import Node
from health.models.health_log import HealthLog
from health.models.habit import Habit
from pipeline.models import MarketingAction
from schedule.models import ScheduleTemplate


class CoreFlowTests(TestCase):
    """Coverage for check-in orchestration and seed data."""

    def setUp(self):
        self.client = APIClient()
        AppSettings.objects.create()
        income_goal = Node.objects.create(
            code="g2",
            title="Reach EUR 1,000/month independent income",
            type=Node.NodeType.GOAL,
            category=Node.Category.FINANCE,
            status=Node.Status.ACTIVE,
        )
        kyrgyzstan_goal = Node.objects.create(
            code="g1",
            title="Move family to Kyrgyzstan",
            type=Node.NodeType.GOAL,
            category=Node.Category.LIFE,
            status=Node.Status.BLOCKED,
        )
        kyrgyzstan_goal.deps.set([income_goal])

    def test_checkin_endpoint_fans_out_records(self):
        MarketingAction.objects.create(
            action="Follow up with a warm lead",
            platform="LinkedIn",
            date=timezone.localdate(),
            follow_up_date=timezone.localdate(),
            follow_up_done=False,
        )
        response = self.client.post(
            "/api/checkin/",
            {
                "sleep_hours": "7.5",
                "sleep_quality": 4,
                "energy_level": 2,
                "exercise_done": True,
                "exercise_type": "Walk",
                "exercise_duration_mins": 30,
                "finance_deltas": [
                    {
                        "type": "income",
                        "source": "Freelance Client",
                        "amount": "250.00",
                        "currency": "EUR",
                        "is_independent": True,
                    },
                ],
                "inbox_text": "Capture the diagnostic framework update.",
                "blockers_text": "Waiting for proposal approval.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(HealthLog.objects.count(), 1)
        self.assertEqual(FinanceEntry.objects.count(), 1)
        self.assertTrue(Idea.objects.filter(title__icontains="Capture the diagnostic").exists())
        self.assertTrue(Node.objects.filter(type=Node.NodeType.BURDEN).exists())
        self.assertTrue(DailyCheckIn.objects.exists())
        self.assertIn("briefing", response.data)
        topics = set(AISuggestion.objects.values_list("topic", flat=True))
        self.assertTrue(topics)
        self.assertTrue(
            topics.issubset(
                {
                    "weekly_review",
                    "pipeline_follow_up",
                    "empty_pipeline",
                    "low_energy_reduced_scope",
                    "habit_reset",
                },
            ),
        )

        repeat_response = self.client.post(
            "/api/checkin/",
            {
                "sleep_hours": "7.0",
                "sleep_quality": 3,
                "energy_level": 2,
                "exercise_done": False,
                "finance_deltas": [],
                "inbox_text": "",
                "blockers_text": "",
            },
            format="json",
        )

        self.assertEqual(repeat_response.status_code, 201)
        self.assertEqual(AISuggestion.objects.count(), len(topics))

    def test_seed_command_creates_baseline_context(self):
        call_command("seed_initial_data")
        self.assertTrue(Profile.objects.filter(full_name="Mohamed Badawy").exists())
        self.assertTrue(Node.objects.filter(code="g1").exists())
        self.assertTrue(ScheduleTemplate.objects.filter(name="Core Day", is_active=True).exists())
        self.assertTrue(Habit.objects.filter(name="Cold shower").exists())
        self.assertTrue(MarketingAction.objects.filter(action__icontains="Follow up with warm LinkedIn lead").exists())
        self.assertTrue(
            FinanceEntry.objects.filter(
                source="K Line Europe",
                date=timezone.localdate().replace(day=1),
            ).exists(),
        )

    def test_seed_command_is_idempotent(self):
        call_command("seed_initial_data")
        call_command("seed_initial_data")

        self.assertEqual(Profile.objects.filter(full_name="Mohamed Badawy").count(), 1)
        self.assertEqual(AppSettings.objects.filter(name="Default Settings").count(), 1)
        self.assertEqual(
            Node.objects.filter(
                code__in=["g1", "g2", "g3", "p1", "p2", "p3", "p4", "t1", "t2", "t3", "t4", "b1", "b2"],
            ).count(),
            13,
        )
        self.assertEqual(ScheduleTemplate.objects.filter(name="Core Day").count(), 1)
        self.assertEqual(Habit.objects.filter(name__in=["Cold shower", "Reading session", "LinkedIn outreach"]).count(), 3)
        self.assertEqual(MarketingAction.objects.filter(action="Follow up with warm LinkedIn lead").count(), 1)
        self.assertEqual(
            FinanceEntry.objects.filter(
                source="K Line Europe",
                date=timezone.localdate().replace(day=1),
            ).count(),
            1,
        )

    def test_dashboard_endpoint_returns_aggregate_payload(self):
        call_command("seed_initial_data")

        response = self.client.get("/api/core/dashboard/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["full_name"], "Mohamed Badawy")
        self.assertIn("finance_summary", response.data)
        self.assertIn("health_summary", response.data)
        self.assertIn("overwhelm", response.data)
        self.assertIn("top_priorities", response.data)
        self.assertIn("pipeline_summary", response.data)
        self.assertIn("today_snapshot", response.data)
        self.assertIn("schedule_snapshot", response.data)
        self.assertIn("review_status", response.data)
        self.assertIn("suggestions_summary", response.data)
        self.assertIn("weekly_review_preview", response.data)
        self.assertIn("blocks", response.data["schedule_snapshot"])
        self.assertIn("active_project_count", response.data["today_snapshot"])
        self.assertIn("pending_count", response.data["suggestions_summary"])

    def test_dashboard_updates_after_checkin(self):
        self.client.post(
            "/api/checkin/",
            {
                "sleep_hours": "5.0",
                "sleep_quality": 2,
                "energy_level": 2,
                "exercise_done": False,
                "mood_score": 2,
                "finance_deltas": [
                    {
                        "type": "income",
                        "source": "Independent Client",
                        "amount": "400.00",
                        "currency": "EUR",
                        "is_independent": True,
                    },
                ],
                "inbox_text": "Capture a low-energy day reflection.",
                "blockers_text": "Low energy is affecting focus.",
            },
            format="json",
        )

        response = self.client.get("/api/core/dashboard/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["latest_checkin"]["date"], timezone.localdate().isoformat())
        self.assertGreaterEqual(float(response.data["finance_summary"]["independent_income_eur"]), 400.0)
        self.assertTrue(response.data["health_summary"]["low_energy_today"])
        self.assertTrue(any("Energy" in signal or "energy" in signal for signal in response.data["key_signals"]))


class ConfigHardeningTests(TestCase):
    """Coverage for config parsing and AppSettings bootstrap behavior."""

    def setUp(self):
        self.client = APIClient()

    def test_database_url_errors_on_unsupported_scheme(self):
        with patch.dict(os.environ, {"DATABASE_URL": "mysql://db.example.com/personal_os"}, clear=True):
            with self.assertRaisesMessage(ValueError, "Unsupported DATABASE_URL scheme: mysql"):
                project_settings._database_config()

    def test_ai_runtime_config_rejects_unknown_provider(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "openai"}, clear=True):
            with self.assertRaisesMessage(ValueError, "AI_PROVIDER must be either deterministic or anthropic."):
                project_settings.get_ai_runtime_config()

    def test_database_url_selects_postgres_configuration(self):
        with patch.dict(
            os.environ,
            {"DATABASE_URL": "postgresql://demo:secret@db.example.com:5433/personal_os"},
            clear=True,
        ):
            config = project_settings._database_config()

        self.assertEqual(config["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(config["NAME"], "personal_os")
        self.assertEqual(config["USER"], "demo")
        self.assertEqual(config["PASSWORD"], "secret")
        self.assertEqual(config["HOST"], "db.example.com")
        self.assertEqual(config["PORT"], 5433)

    def test_db_name_selects_postgres_configuration(self):
        with patch.dict(
            os.environ,
            {
                "DB_NAME": " personal_os ",
                "DB_USER": " postgres ",
                "DB_PASSWORD": "secret",
                "DB_HOST": " db.internal ",
                "DB_PORT": " 5434 ",
            },
            clear=True,
        ):
            config = project_settings._database_config()

        self.assertEqual(config["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(config["NAME"], "personal_os")
        self.assertEqual(config["USER"], "postgres")
        self.assertEqual(config["HOST"], "db.internal")
        self.assertEqual(config["PORT"], "5434")

    def test_csv_and_bool_env_values_are_normalized(self):
        with patch.dict(
            os.environ,
            {
                "ALLOWED_HOSTS": " localhost, 127.0.0.1 , ",
                "CORS_ALLOWED_ORIGINS": " http://localhost:5173 , http://127.0.0.1:5173 ",
                "DEBUG": " yes ",
            },
            clear=True,
        ):
            self.assertEqual(project_settings._env_csv("ALLOWED_HOSTS"), ["localhost", "127.0.0.1"])
            self.assertEqual(
                project_settings._env_csv("CORS_ALLOWED_ORIGINS"),
                ["http://localhost:5173", "http://127.0.0.1:5173"],
            )
            self.assertTrue(project_settings._env_bool("DEBUG"))

    def test_bootstrap_defaults_create_app_settings_from_env(self):
        with patch.dict(
            os.environ,
            {
                "CURRENCY_EUR_USD_RATE": "1.12",
                "CURRENCY_EUR_EGP_RATE": "41.25",
                "INDEPENDENT_INCOME_TARGET_EUR": "1500",
                "EMPLOYMENT_INCOME_SOURCE_NAME": "Ops Salary",
                "KYRGYZSTAN_GOAL_CODE": "life-1",
                "INDEPENDENT_INCOME_GOAL_CODE": "money-1",
                "APP_SETTINGS_TIMEZONE": "UTC",
            },
            clear=True,
        ):
            settings_obj = AppSettings.get_solo()

        self.assertEqual(settings_obj.eur_to_usd_rate, Decimal("1.12"))
        self.assertEqual(settings_obj.eur_to_egp_rate, Decimal("41.25"))
        self.assertEqual(settings_obj.independent_income_target_eur, Decimal("1500"))
        self.assertEqual(settings_obj.employment_income_source_name, "Ops Salary")
        self.assertEqual(settings_obj.kyrgyzstan_goal_code, "life-1")
        self.assertEqual(settings_obj.independent_income_goal_code, "money-1")
        self.assertEqual(settings_obj.timezone, "UTC")

    def test_existing_app_settings_override_bootstrap_env(self):
        existing = AppSettings.objects.create(
            eur_to_usd_rate=Decimal("9.99"),
            independent_income_target_eur=Decimal("5000"),
        )

        with patch.dict(
            os.environ,
            {
                "CURRENCY_EUR_USD_RATE": "1.05",
                "INDEPENDENT_INCOME_TARGET_EUR": "1000",
            },
            clear=True,
        ):
            settings_obj = FinanceMetricsService.app_settings()

        self.assertEqual(settings_obj.id, existing.id)
        self.assertEqual(settings_obj.eur_to_usd_rate, Decimal("9.99"))
        self.assertEqual(settings_obj.independent_income_target_eur, Decimal("5000"))

    def test_dashboard_payload_stays_stable_with_sparse_data(self):
        response = self.client.get("/api/core/dashboard/")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["profile"])
        self.assertEqual(response.data["top_priorities"], [])
        self.assertIsInstance(response.data["key_signals"], list)
        self.assertIsNotNone(response.data["settings"])
        self.assertEqual(Decimal(str(response.data["finance_summary"]["independent_income_eur"])), Decimal("0"))
        self.assertEqual(response.data["health_summary"]["exercise_streak"], 0)


class AIRuntimeTests(TestCase):
    """Coverage for AI provider selection, structured output, and fallback behavior."""

    def test_get_ai_provider_defaults_to_deterministic_without_key(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "anthropic"}, clear=True):
            provider = get_ai_provider()

        self.assertIsInstance(provider, DeterministicAIProvider)

    def test_get_ai_provider_selects_anthropic_when_configured(self):
        with patch.dict(
            os.environ,
            {
                "AI_PROVIDER": "anthropic",
                "ANTHROPIC_API_KEY": "test-key",
                "ANTHROPIC_MODEL": "claude-sonnet-4-6",
            },
            clear=True,
        ):
            provider = get_ai_provider()

        self.assertIsInstance(provider, AnthropicAIProvider)
        self.assertEqual(provider.model, "claude-sonnet-4-6")

    @patch("core.ai.AnthropicAIProvider._request_json")
    def test_anthropic_provider_can_return_structured_briefing(self, request_json):
        request_json.return_value = {
            "briefing_text": "Protect the first income block before anything reactive.",
            "top_priorities": ["Protect the first income block"],
            "observations": ["Pipeline follow-up is still due."],
            "encouragement": "Keep the system narrow and honest today.",
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
            provider = get_ai_provider()
            briefing = provider.generate_morning_briefing(
                profile=None,
                finance_summary={
                    "independent_income_eur": 250,
                    "net_eur": 600,
                    "kyrgyzstan_progress_pct": 25,
                },
                health_summary={
                    "avg_sleep_7d": 7,
                    "avg_energy_7d": 3,
                    "avg_mood_7d": 3,
                    "low_sleep_today": False,
                    "low_energy_today": False,
                    "low_mood_today": False,
                    "low_mood_streak": 0,
                    "habit_completion_rate_7d": 60,
                    "prayer_completion_rate_7d": 70,
                    "prayer_gap_streak": 0,
                    "spiritual_consistency_7d": 60,
                },
                top_priorities=["Income goal"],
                blockers_text="",
            )

        self.assertEqual(briefing["briefing_text"], "Protect the first income block before anything reactive.")
        self.assertEqual(briefing["top_priorities"], ["Protect the first income block"])

    @patch("core.ai.AnthropicAIProvider._request_json", side_effect=RuntimeError("boom"))
    def test_anthropic_provider_falls_back_cleanly(self, request_json):
        with patch.dict(
            os.environ,
            {
                "AI_PROVIDER": "anthropic",
                "ANTHROPIC_API_KEY": "test-key",
                "ANTHROPIC_MODEL": "claude-sonnet-4-6",
            },
            clear=True,
        ):
            provider = get_ai_provider()
            briefing = provider.generate_morning_briefing(
                profile=None,
                finance_summary={
                    "independent_income_eur": 250,
                    "net_eur": 600,
                    "kyrgyzstan_progress_pct": 25,
                },
                health_summary={
                    "avg_sleep_7d": 7,
                    "avg_energy_7d": 3,
                    "avg_mood_7d": 3,
                    "low_sleep_today": False,
                    "low_energy_today": True,
                    "low_mood_today": False,
                    "low_mood_streak": 0,
                    "habit_completion_rate_7d": 60,
                    "prayer_completion_rate_7d": 70,
                    "prayer_gap_streak": 0,
                    "spiritual_consistency_7d": 60,
                },
                top_priorities=["Income goal"],
                blockers_text="",
            )

        self.assertIn("briefing_text", briefing)
        self.assertTrue(briefing["observations"])


class CommandCenterTests(TestCase):
    """Coverage for the command center payload and smart capture contract."""

    def setUp(self):
        self.client = APIClient()
        AppSettings.objects.create()

    def test_command_center_endpoint_returns_expected_sections(self):
        call_command("seed_initial_data")

        response = self.client.get("/api/core/command-center/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("briefing", response.data)
        self.assertIn("priorities", response.data)
        self.assertIn("schedule", response.data)
        self.assertIn("health_today", response.data)
        self.assertIn("finance", response.data)
        self.assertIn("pipeline", response.data)
        self.assertIn("weekly_review", response.data)
        self.assertIn("status_cards", response.data)
        self.assertIn("recent_progress", response.data)
        self.assertIn("reentry", response.data)
        self.assertIn("top_priorities", response.data)
        self.assertIsInstance(response.data["status_cards"], list)

    def test_command_center_reentry_activates_after_gap(self):
        income_goal = Node.objects.create(
            code="g2",
            title="Reach EUR 1,000/month independent income",
            type=Node.NodeType.GOAL,
            category=Node.Category.FINANCE,
            status=Node.Status.ACTIVE,
        )
        Node.objects.create(
            title="Send outreach messages",
            type=Node.NodeType.TASK,
            category=Node.Category.CAREER,
            status=Node.Status.AVAILABLE,
            parent=income_goal,
        )
        DailyCheckIn.objects.create(
            date=timezone.localdate() - timedelta(days=4),
            inbox_text="Old inbox",
            blockers_text="Old blocker",
            briefing_text="Old briefing",
        )

        response = self.client.get("/api/core/command-center/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["reentry"]["active"])
        self.assertEqual(response.data["reentry"]["days_away"], 4)
        self.assertTrue(response.data["reentry"]["matters_now"])

    @patch("core.chat_views.run_chat")
    def test_chat_endpoint_returns_affected_modules(self, mock_run_chat):
        mock_run_chat.return_value = {
            "reply": "Logged the expense and captured the idea.",
            "actions": [
                {"tool": "add_finance_entry", "result": {"status": "saved"}},
                {"tool": "capture_idea", "result": {"status": "captured"}},
            ],
            "affected_modules": ["finance", "analytics"],
        }

        response = self.client.post(
            "/api/core/chat/",
            {
                "messages": [{"role": "user", "content": "Log a taxi expense and capture a product idea."}],
                "context": {"surface": "command_center", "capture_mode": "smart_inbox"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["affected_modules"], ["finance", "analytics"])
        mock_run_chat.assert_called_once_with(
            [{"role": "user", "content": "Log a taxi expense and capture a product idea."}],
            context={"surface": "command_center", "capture_mode": "smart_inbox"},
        )

    def test_command_center_capture_auto_applies_single_obvious_action(self):
        response = self.client.post(
            "/api/core/chat/",
            {
                "messages": [{"role": "user", "content": "Capture this idea: Telegram reminder bot"}],
                "context": {
                    "surface": "command_center",
                    "mode": "command_center_capture",
                    "quick_action": "idea",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["requires_confirmation"])
        self.assertEqual(response.data["affected_modules"], ["analytics"])
        self.assertTrue(Idea.objects.filter(title__icontains="Telegram reminder bot").exists())

    def test_command_center_capture_requires_confirmation_for_multi_step_changes(self):
        review_response = self.client.post(
            "/api/core/chat/",
            {
                "messages": [
                    {
                        "role": "user",
                        "content": "Log a 120 EGP taxi expense and capture a Telegram reminder idea.",
                    },
                ],
                "context": {
                    "surface": "command_center",
                    "mode": "command_center_capture",
                },
            },
            format="json",
        )

        self.assertEqual(review_response.status_code, 200)
        self.assertTrue(review_response.data["requires_confirmation"])
        self.assertEqual(FinanceEntry.objects.count(), 0)
        self.assertEqual(Idea.objects.count(), 0)
        self.assertEqual(len(review_response.data["proposed_actions"]), 2)

        confirm_response = self.client.post(
            "/api/core/chat/",
            {
                "messages": [
                    {
                        "role": "user",
                        "content": "Log a 120 EGP taxi expense and capture a Telegram reminder idea.",
                    },
                ],
                "context": {
                    "surface": "command_center",
                    "mode": "command_center_capture",
                    "confirm_capture": True,
                    "proposed_actions": review_response.data["proposed_actions"],
                },
            },
            format="json",
        )

        self.assertEqual(confirm_response.status_code, 200)
        self.assertFalse(confirm_response.data["requires_confirmation"])
        self.assertEqual(confirm_response.data["affected_modules"], ["finance", "analytics"])
        self.assertEqual(FinanceEntry.objects.count(), 1)
        self.assertEqual(Idea.objects.count(), 1)

    def test_progress_report_endpoint_returns_grouped_sections(self):
        call_command("seed_initial_data")

        response = self.client.get("/api/reports/progress/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "progress")
        self.assertIn("command_center", response.data["sections"])
        self.assertIn("work", response.data["sections"])
        self.assertIn("Progress Report", response.data["report"])

    def test_personal_review_report_endpoint_returns_grouped_sections(self):
        call_command("seed_initial_data")

        response = self.client.get("/api/reports/personal-review/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "personal-review")
        self.assertIn("weekly_review", response.data["sections"])
        self.assertIn("timeline", response.data["sections"])
        self.assertIn("health", response.data["sections"])
        self.assertIn("Personal Review Report", response.data["report"])
