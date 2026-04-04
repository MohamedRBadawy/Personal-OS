"""Tests for finance calculations and goal synchronization."""
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import AppSettings
from finance.models import FinanceEntry, IncomeSource
from finance.services import FinanceMetricsService
from goals.models import Node


class FinanceMetricsTests(TestCase):
    """Coverage for EUR normalization and Kyrgyzstan goal syncing."""

    def setUp(self):
        AppSettings.objects.create(independent_income_target_eur=1000)
        self.income_goal = Node.objects.create(
            code="g2",
            title="Reach EUR 1,000/month independent income",
            type=Node.NodeType.GOAL,
            category=Node.Category.FINANCE,
            status=Node.Status.ACTIVE,
        )
        self.kyrgyzstan_goal = Node.objects.create(
            code="g1",
            title="Move family to Kyrgyzstan",
            type=Node.NodeType.GOAL,
            category=Node.Category.LIFE,
            status=Node.Status.BLOCKED,
        )
        self.kyrgyzstan_goal.deps.set([self.income_goal])

    def test_summary_converts_to_eur(self):
        FinanceEntry.objects.create(
            type=FinanceEntry.EntryType.INCOME,
            source="USD Client",
            amount=Decimal("108.00"),
            currency=FinanceEntry.Currency.USD,
            is_independent=True,
            date=timezone.localdate(),
        )

        summary = FinanceMetricsService.summary()
        self.assertEqual(summary["independent_income_eur"], Decimal("100.00"))

    def test_income_drop_reblocks_kyrgyzstan_goal(self):
        entry = FinanceEntry.objects.create(
            type=FinanceEntry.EntryType.INCOME,
            source="Independent Client",
            amount=Decimal("1000.00"),
            currency=FinanceEntry.Currency.EUR,
            is_independent=True,
            date=timezone.localdate(),
        )
        FinanceMetricsService.sync_goal_status()

        self.income_goal.refresh_from_db()
        self.kyrgyzstan_goal.refresh_from_db()
        self.assertEqual(self.income_goal.status, Node.Status.DONE)
        self.assertEqual(self.kyrgyzstan_goal.status, Node.Status.AVAILABLE)

        entry.amount = Decimal("500.00")
        entry.save()
        FinanceMetricsService.sync_goal_status()

        self.income_goal.refresh_from_db()
        self.kyrgyzstan_goal.refresh_from_db()
        self.assertEqual(self.income_goal.status, Node.Status.ACTIVE)
        self.assertEqual(self.kyrgyzstan_goal.status, Node.Status.BLOCKED)


class FinanceWorkspaceTests(TestCase):
    """Coverage for grouped finance endpoints and income-source planning."""

    def setUp(self):
        self.client = APIClient()
        AppSettings.objects.create(independent_income_target_eur=1000)
        self.income_goal = Node.objects.create(
            code="g2",
            title="Reach EUR 1,000/month independent income",
            type=Node.NodeType.GOAL,
            category=Node.Category.FINANCE,
            status=Node.Status.ACTIVE,
        )
        self.kyrgyzstan_goal = Node.objects.create(
            code="g1",
            title="Move family to Kyrgyzstan",
            type=Node.NodeType.GOAL,
            category=Node.Category.LIFE,
            status=Node.Status.BLOCKED,
        )
        self.kyrgyzstan_goal.deps.set([self.income_goal])

    def test_income_source_crud_and_overview_payload(self):
        create_response = self.client.post(
            "/api/finance/income-sources/",
            {
                "name": "Freelance Retainers",
                "category": "Freelance",
                "monthly_target_eur": "1000.00",
                "baseline_amount_eur": "250.00",
                "active": True,
                "notes": "Primary independent income stream.",
            },
            format="json",
        )
        FinanceEntry.objects.create(
            type=FinanceEntry.EntryType.INCOME,
            source="Freelance Retainers",
            amount=Decimal("250.00"),
            currency=FinanceEntry.Currency.EUR,
            is_independent=True,
            date=timezone.localdate(),
        )

        overview_response = self.client.get("/api/finance/overview/")

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(IncomeSource.objects.count(), 1)
        self.assertEqual(overview_response.status_code, 200)
        self.assertEqual(len(overview_response.data["income_sources"]), 1)
        self.assertEqual(overview_response.data["income_sources"][0]["name"], "Freelance Retainers")
        self.assertEqual(overview_response.data["target_tracking"]["active_income_sources"], 1)
        self.assertEqual(len(overview_response.data["recent_entries"]), 1)

    def test_financial_report_endpoint_returns_named_report(self):
        FinanceEntry.objects.create(
            type=FinanceEntry.EntryType.INCOME,
            source="Freelance Retainers",
            amount=Decimal("250.00"),
            currency=FinanceEntry.Currency.EUR,
            is_independent=True,
            date=timezone.localdate(),
        )

        response = self.client.get("/api/reports/financial/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "financial")
        self.assertIn("Financial Report", response.data["report"])
        self.assertIn("sections", response.data)

    def test_deleting_income_entry_reblocks_kyrgyzstan_goal(self):
        entry = FinanceEntry.objects.create(
            type=FinanceEntry.EntryType.INCOME,
            source="Independent Client",
            amount=Decimal("1000.00"),
            currency=FinanceEntry.Currency.EUR,
            is_independent=True,
            date=timezone.localdate(),
        )
        FinanceMetricsService.sync_goal_status()

        self.income_goal.refresh_from_db()
        self.kyrgyzstan_goal.refresh_from_db()
        self.assertEqual(self.income_goal.status, Node.Status.DONE)
        self.assertEqual(self.kyrgyzstan_goal.status, Node.Status.AVAILABLE)

        entry.delete()
        FinanceMetricsService.sync_goal_status()

        self.income_goal.refresh_from_db()
        self.kyrgyzstan_goal.refresh_from_db()
        self.assertEqual(self.income_goal.status, Node.Status.ACTIVE)
        self.assertEqual(self.kyrgyzstan_goal.status, Node.Status.BLOCKED)
