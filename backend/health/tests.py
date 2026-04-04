"""Tests for the health workspace read model and validation rules."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from health.models.habit import Habit, HabitLog
from health.models.health_log import HealthLog
from health.models.mood_log import MoodLog
from health.models.spiritual_log import SpiritualLog


class HealthWorkspaceTests(TestCase):
    """Coverage for the expanded health workspace and its signals."""

    def setUp(self):
        self.client = APIClient()
        self.today = timezone.localdate()

    def test_health_today_endpoint_returns_empty_state_payload(self):
        response = self.client.get("/api/health/today/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["date"], self.today.isoformat())
        self.assertIsNone(response.data["health_log"])
        self.assertIsNone(response.data["mood_log"])
        self.assertIsNone(response.data["spiritual_log"])
        self.assertEqual(response.data["habit_board"], [])
        self.assertFalse(response.data["summary"]["health_logged_today"])
        self.assertEqual(response.data["summary"]["active_habits_count"], 0)

    def test_health_today_endpoint_returns_logs_and_habit_board(self):
        habit = Habit.objects.create(name="Cold shower", target=Habit.Target.DAILY)
        HealthLog.objects.create(
            date=self.today,
            sleep_hours="7.0",
            sleep_quality=4,
            energy_level=3,
            exercise_done=True,
            exercise_type="Walk",
        )
        MoodLog.objects.create(date=self.today, mood_score=4, notes="Steady.")
        SpiritualLog.objects.create(
            date=self.today,
            fajr=True,
            dhuhr=True,
            asr=True,
            maghrib=True,
            isha=False,
            quran_pages=5,
            dhikr_done=True,
        )
        HabitLog.objects.create(habit=habit, date=self.today, done=True)

        response = self.client.get("/api/health/today/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["health_log"]["date"], self.today.isoformat())
        self.assertEqual(response.data["mood_log"]["mood_score"], 4)
        self.assertEqual(response.data["spiritual_log"]["prayers_count"], 4)
        self.assertEqual(len(response.data["habit_board"]), 1)
        board_item = response.data["habit_board"][0]
        self.assertEqual(board_item["habit"]["name"], "Cold shower")
        self.assertTrue(board_item["today_log"]["done"])
        self.assertEqual(board_item["current_streak"], 1)
        self.assertEqual(response.data["summary"]["habits_completed_today"], 1)
        self.assertTrue(response.data["summary"]["mood_logged_today"])
        self.assertTrue(response.data["summary"]["spiritual_logged_today"])

    def test_duplicate_mood_log_returns_clear_validation_error(self):
        MoodLog.objects.create(date=self.today, mood_score=3)

        response = self.client.post(
            "/api/health/moods/",
            {"date": self.today.isoformat(), "mood_score": 2, "notes": ""},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Update the existing record instead", response.data["date"][0])

    def test_duplicate_spiritual_log_returns_clear_validation_error(self):
        SpiritualLog.objects.create(date=self.today)

        response = self.client.post(
            "/api/health/spiritual/",
            {
                "date": self.today.isoformat(),
                "fajr": True,
                "dhuhr": False,
                "asr": False,
                "maghrib": False,
                "isha": False,
                "quran_pages": 0,
                "dhikr_done": False,
                "notes": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Update the existing record instead", response.data["date"][0])

    def test_duplicate_habit_log_returns_clear_validation_error(self):
        habit = Habit.objects.create(name="Reading session", target=Habit.Target.DAILY)
        HabitLog.objects.create(habit=habit, date=self.today, done=True)

        response = self.client.post(
            "/api/health/habit-logs/",
            {
                "habit": str(habit.id),
                "date": self.today.isoformat(),
                "done": False,
                "note": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "Update the existing record instead",
            response.data["non_field_errors"][0],
        )

    def test_dashboard_and_review_preview_use_richer_health_signals(self):
        habit = Habit.objects.create(name="Cold shower", target=Habit.Target.DAILY)
        for offset in (0, 1):
            MoodLog.objects.create(
                date=self.today - timedelta(days=offset),
                mood_score=2,
            )
            SpiritualLog.objects.create(
                date=self.today - timedelta(days=offset),
                fajr=True,
                dhuhr=False,
                asr=False,
                maghrib=False,
                isha=False,
                quran_pages=0,
                dhikr_done=False,
            )
        HabitLog.objects.create(
            habit=habit,
            date=self.today - timedelta(days=6),
            done=False,
        )

        dashboard = self.client.get("/api/core/dashboard/")
        review = self.client.get("/api/analytics/reviews/preview/")

        self.assertEqual(dashboard.status_code, 200)
        self.assertTrue(
            any("Mood has been low" in signal for signal in dashboard.data["key_signals"]),
        )
        self.assertTrue(
            any("Habit follow-through" in signal for signal in dashboard.data["key_signals"]),
        )
        self.assertTrue(
            any("Spiritual consistency" in signal for signal in dashboard.data["key_signals"]),
        )
        self.assertEqual(review.status_code, 200)
        self.assertIn("Habit completion (7d)", review.data["report"])
        self.assertIn("Prayer completion (7d)", review.data["report"])

    def test_health_overview_endpoint_returns_grouped_capacity_payload(self):
        HealthLog.objects.create(
            date=self.today,
            sleep_hours="7.0",
            sleep_quality=4,
            energy_level=3,
            exercise_done=True,
            exercise_type="Walk",
        )
        MoodLog.objects.create(date=self.today, mood_score=3, notes="Steady")
        SpiritualLog.objects.create(
            date=self.today,
            fajr=True,
            dhuhr=True,
            asr=True,
            maghrib=True,
            isha=False,
            quran_pages=4,
            dhikr_done=True,
        )

        response = self.client.get("/api/health/overview/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("summary", response.data)
        self.assertIn("today", response.data)
        self.assertIn("recent_health_logs", response.data)
        self.assertIn("capacity_signals", response.data)
        self.assertGreaterEqual(len(response.data["recent_health_logs"]), 1)
        self.assertTrue(response.data["capacity_signals"])
