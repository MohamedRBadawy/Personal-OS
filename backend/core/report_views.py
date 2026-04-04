"""Named report endpoints for the PRD-aligned workspaces."""
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.services import TimelineOverviewService, WeeklyReviewService
from core.services import CommandCenterService
from finance.services import FinanceOverviewService
from health.services import HealthSummaryService
from pipeline.services import WorkOverviewService


class FinancialReportView(APIView):
    """Return the generated financial report payload."""

    def get(self, request):
        overview = FinanceOverviewService.payload()
        report = (
            "Financial Report\n"
            f"- Month: {overview['summary']['month']}\n"
            f"- Independent income: EUR {overview['summary']['independent_income_eur']}\n"
            f"- Net this month: EUR {overview['summary']['net_eur']}\n"
            f"- Progress to target: {overview['summary']['kyrgyzstan_progress_pct']}%\n"
            f"- Active income sources: {overview['target_tracking']['active_income_sources']}"
        )
        return Response(
            {
                "name": "financial",
                "generated_at": timezone.now().isoformat(),
                "report": report,
                "sections": overview,
            },
            status=status.HTTP_200_OK,
        )


class ProgressReportView(APIView):
    """Return a grouped progress report across the system."""

    def get(self, request):
        command_center = CommandCenterService.payload()
        work = WorkOverviewService.payload()
        report = (
            "Progress Report\n"
            f"- Visible priorities: {len(command_center['priorities'])}\n"
            f"- Recent progress items: {len(command_center['recent_progress'])}\n"
            f"- Active work items: {work['summary']['active_task_count']}\n"
            f"- Due follow-ups: {work['summary']['due_follow_ups_count']}"
        )
        return Response(
            {
                "name": "progress",
                "generated_at": timezone.now().isoformat(),
                "report": report,
                "sections": {
                    "command_center": command_center,
                    "work": work,
                },
            },
            status=status.HTTP_200_OK,
        )


class PersonalReviewReportView(APIView):
    """Return the weekly personal review report payload."""

    def get(self, request):
        preview = WeeklyReviewService.serialize_preview(WeeklyReviewService.preview())
        timeline = TimelineOverviewService.payload()
        health = HealthSummaryService.summary()
        report = (
            "Personal Review Report\n"
            f"- Week: {preview['week_start']} to {preview['week_end']}\n"
            f"- Avg mood (7d): {health['avg_mood_7d']}\n"
            f"- Avg sleep (7d): {health['avg_sleep_7d']}\n"
            f"- Retrospectives available: {len(timeline['retrospectives'])}"
        )
        return Response(
            {
                "name": "personal-review",
                "generated_at": timezone.now().isoformat(),
                "report": report,
                "sections": {
                    "weekly_review": preview,
                    "timeline": timeline,
                    "health": health,
                },
            },
            status=status.HTTP_200_OK,
        )
