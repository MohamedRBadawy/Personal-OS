"""Core endpoints for profile/settings and daily check-ins."""
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import AppSettings, Profile
from core.serializers import (
    AppSettingsSerializer,
    DailyCheckInRequestSerializer,
    ProfileSerializer,
)
from core.services import CheckInService, CommandCenterService, DashboardService


class ProfileViewSet(viewsets.ModelViewSet):
    """CRUD API for profile records."""

    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer


class AppSettingsViewSet(viewsets.ModelViewSet):
    """CRUD API for app settings."""

    queryset = AppSettings.objects.all()
    serializer_class = AppSettingsSerializer


class DailyCheckInView(APIView):
    """POST endpoint that fans a morning check-in into domain records."""

    def post(self, request):
        serializer = DailyCheckInRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = CheckInService.submit(serializer.validated_data)
        response = {
            "checkin_id": result["checkin"].id,
            "health_log_id": result["health_log"].id,
            "mood_log_id": getattr(result["mood_log"], "id", None),
            "finance_entry_ids": [entry.id for entry in result["finance_entries"]],
            "idea_id": getattr(result["idea"], "id", None),
            "blocker_id": getattr(result["blocker"], "id", None),
            "briefing": result["briefing"],
            "finance_summary": result["finance_summary"],
            "health_summary": result["health_summary"],
        }
        return Response(response, status=status.HTTP_201_CREATED)


class DashboardView(APIView):
    """GET endpoint returning the home-screen aggregate payload."""

    def get(self, request):
        return Response(DashboardService.payload(), status=status.HTTP_200_OK)


class CommandCenterView(APIView):
    """GET endpoint returning the unified command-center payload."""

    def get(self, request):
        return Response(CommandCenterService.payload(), status=status.HTTP_200_OK)


class NextActionView(APIView):
    """POST endpoint — returns the single most important action to take right now."""

    def post(self, request):
        from django.utils import timezone  # noqa: PLC0415

        from core.ai import get_ai_provider  # noqa: PLC0415
        from goals.models import Node  # noqa: PLC0415
        from pipeline.models import MarketingAction  # noqa: PLC0415
        from schedule.models import RoutineLog  # noqa: PLC0415

        today = timezone.localdate()

        # Build top nodes (same leverage logic as prioritize endpoint)
        EFFORT_WEIGHT = {
            "15min": 1, "30min": 1, "1h": 1,
            "2h": 2, "4h": 2, "1day": 3,
            "2days": 3, "1week": 4, "ongoing": 2,
        }
        qs = Node.objects.exclude(status__in=["done", "deferred"]).prefetch_related("deps", "dependents")
        nodes_ranked = []
        for node in qs:
            dep_count = node.dependents.count()
            priority_val = node.priority or 3
            effort_w = EFFORT_WEIGHT.get(node.effort or "", 2)
            score = dep_count * 3 + (5 - priority_val) * 2 + (2 if node.status == "active" else 1) - effort_w
            nodes_ranked.append({
                "id": str(node.id),
                "title": node.title,
                "type": node.type,
                "status": node.status,
                "dependent_count": dep_count,
                "leverage_score": score,
            })
        nodes_ranked.sort(key=lambda x: x["leverage_score"], reverse=True)
        top_nodes = nodes_ranked[:5]

        # Today's routine completion
        today_logs = RoutineLog.objects.filter(date=today)
        done_logs = today_logs.filter(status__in=["done", "partial"]).count()
        total_logs = today_logs.count()
        routine_pct = round((done_logs / total_logs) * 100) if total_logs > 0 else 0

        # Due follow-ups
        due_follow_ups_count = MarketingAction.objects.filter(
            follow_up_date__lte=today,
            result="",
        ).count()

        # Build profile context for AI personalisation
        try:
            from profile.models import UserProfile  # noqa: PLC0415
            profile_obj = UserProfile.get_or_create_singleton()
            independent = profile_obj.monthly_independent_income or 0
            target = profile_obj.financial_target_monthly or 1000
            profile_context = (
                f"User: {profile_obj.full_name or 'Mohamed'}, "
                f"{profile_obj.personality_type or 'INTP'}, {profile_obj.religion or 'Muslim'}. "
                f"Financial target: {target} {profile_obj.financial_target_currency}/mo. "
                f"Current independent income: {independent} {profile_obj.financial_target_currency}."
            )
        except Exception:  # noqa: BLE001
            profile_context = ""

        provider = get_ai_provider()
        result = provider.suggest_next_action(
            top_nodes=top_nodes,
            routine_pct=routine_pct,
            due_follow_ups_count=due_follow_ups_count,
            profile_context=profile_context,
        )
        return Response(result, status=status.HTTP_200_OK)


class TelegramWebhookView(APIView):
    """POST endpoint for Telegram bot webhook — no auth required (Telegram posts without tokens)."""

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        from core.telegram_bot import handle_webhook  # noqa: PLC0415

        handle_webhook(request.data)
        return Response({"ok": True})
