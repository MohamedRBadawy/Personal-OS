"""Core endpoints for profile/settings and daily check-ins."""
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Alert, AppSettings, DailyCheckIn, Profile, ReadinessSnapshot
from core.serializers import (
    AlertSerializer,
    AppSettingsSerializer,
    DailyCheckInRequestSerializer,
    DailyCheckInStatusSerializer,
    EveningCheckInSerializer,
    ProfileSerializer,
)
from core.services import CheckInService, CommandCenterService, DashboardService


class ServiceHealthView(APIView):
    """Lightweight health endpoint for uptime checks and cold-start validation."""

    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "service": "personal-os-api",
                "timestamp": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class ProfileViewSet(viewsets.ModelViewSet):
    """CRUD API for profile records."""

    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer


class AppSettingsViewSet(viewsets.ModelViewSet):
    """CRUD API for app settings."""

    queryset = AppSettings.objects.all()
    serializer_class = AppSettingsSerializer

    @action(detail=True, methods=["post"])
    def toggle_bad_day(self, request, pk=None):
        """Flip bad_day_mode on/off. Returns new state."""
        settings = self.get_object()
        settings.bad_day_mode = not settings.bad_day_mode
        settings.save(update_fields=["bad_day_mode"])
        return Response({"bad_day_mode": settings.bad_day_mode})


class DailyCheckInView(APIView):
    """POST endpoint that fans a morning check-in into domain records."""

    def post(self, request):
        from django.utils import timezone  # noqa: PLC0415

        serializer = DailyCheckInRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = CheckInService.submit(serializer.validated_data)

        # Mark morning as complete
        checkin = result["checkin"]
        if not checkin.morning_completed_at:
            checkin.morning_completed_at = timezone.now()
            checkin.save(update_fields=["morning_completed_at"])

        response = {
            "checkin_id": checkin.id,
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


class ReadinessView(APIView):
    """GET the current Kyrgyzstan readiness score, computing it if today's is missing."""

    def get(self, request):
        from django.utils import timezone  # noqa: PLC0415

        today = timezone.localdate()

        # Return cached snapshot for today or compute on demand
        snapshot = ReadinessSnapshot.objects.filter(date=today).first()
        if not snapshot:
            from django.core.management import call_command  # noqa: PLC0415
            call_command("compute_readiness", verbosity=0)
            snapshot = ReadinessSnapshot.objects.filter(date=today).first()

        if not snapshot:
            return Response({"total_score": 0, "breakdown": {}, "history": []})

        # Last 30 days history for sparkline
        history = list(
            ReadinessSnapshot.objects.order_by("-date")[:30]
            .values("date", "total_score")
        )
        history = [{"date": str(h["date"]), "score": float(h["total_score"])} for h in history]
        history.reverse()

        # Project when score hits 100 based on avg gain per week
        projected_date = None
        if len(history) >= 7:
            recent_7 = [h["score"] for h in history[-7:]]
            weekly_gain = recent_7[-1] - recent_7[0]
            if weekly_gain > 0:
                weeks_to_100 = (100 - float(snapshot.total_score)) / weekly_gain
                import datetime  # noqa: PLC0415
                projected_date = (today + datetime.timedelta(weeks=weeks_to_100)).isoformat()

        return Response({
            "date": today.isoformat(),
            "total_score": float(snapshot.total_score),
            "breakdown": {
                "income":   {"score": float(snapshot.income_score),    "max": 40, "label": "Independent income"},
                "debt":     {"score": float(snapshot.debt_score),      "max": 15, "label": "Debt cleared"},
                "pipeline": {"score": float(snapshot.pipeline_score),  "max": 10, "label": "Outreach pipeline"},
                "routine":  {"score": float(snapshot.routine_score),   "max": 10, "label": "Routine streak"},
                "spiritual":{"score": float(snapshot.spiritual_score), "max": 10, "label": "Prayer consistency"},
                "savings":  {"score": float(snapshot.savings_score),   "max": 10, "label": "Savings buffer"},
                "family":   {"score": float(snapshot.family_score),    "max": 5,  "label": "Family goals"},
            },
            "snapshot_data": snapshot.snapshot_data,
            "history": history,
            "projected_date": projected_date,
        })


class DailyCheckInStatusView(APIView):
    """GET today's morning/evening completion status. POST to submit evening check-in."""

    def get(self, request):
        from django.utils import timezone  # noqa: PLC0415

        today = timezone.localdate()
        checkin = DailyCheckIn.objects.filter(date=today).first()

        data = {
            "date": today.isoformat(),
            "morning_done": bool(checkin and checkin.morning_completed_at),
            "evening_done": bool(checkin and checkin.evening_completed_at),
            "morning_completed_at": checkin.morning_completed_at if checkin else None,
            "evening_completed_at": checkin.evening_completed_at if checkin else None,
        }
        serializer = DailyCheckInStatusSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Submit evening check-in fields and mark evening as complete."""
        from django.utils import timezone  # noqa: PLC0415

        serializer = EveningCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        today = timezone.localdate()
        checkin, _ = DailyCheckIn.objects.get_or_create(date=today)

        # Update evening fields
        data = serializer.validated_data
        if "mood_score" in data:
            checkin.mood_score = data["mood_score"]
        if "gratitude_note" in data:
            checkin.gratitude_note = data.get("gratitude_note", "")
        if "evening_wins" in data:
            checkin.evening_wins = data.get("evening_wins", "")
        if "tomorrow_focus" in data:
            checkin.tomorrow_focus = data.get("tomorrow_focus", "")

        checkin.evening_completed_at = timezone.now()
        checkin.save()

        return Response({
            "checkin_id": checkin.id,
            "evening_done": True,
            "evening_completed_at": checkin.evening_completed_at,
        }, status=status.HTTP_200_OK)


class FocusView(APIView):
    """GET the single most important thing to do right now.

    Returns:
    - current_block: the routine block happening right now (or next upcoming)
    - top_node: highest-leverage unblocked goal node
    - checkin_status: whether morning / evening check-in is done today
    - next_prayer: label + minutes until next prayer block
    - instruction: one-sentence plain-English action from AI
    """

    def get(self, request):
        from django.utils import timezone  # noqa: PLC0415

        from goals.models import Node  # noqa: PLC0415
        from schedule.models import RoutineBlock  # noqa: PLC0415

        now = timezone.localtime()
        today = now.date()
        current_time = now.time()

        # ── Current / next routine block ─────────────────────────────────────
        blocks = list(RoutineBlock.objects.filter(active=True).order_by("time"))
        current_block = None
        next_block = None
        for i, block in enumerate(blocks):
            import datetime  # noqa: PLC0415
            block_end = (
                datetime.datetime.combine(today, block.time)
                + datetime.timedelta(minutes=block.duration_minutes)
            ).time()
            if block.time <= current_time < block_end:
                current_block = block
                next_block = blocks[i + 1] if i + 1 < len(blocks) else None
                break
            if block.time > current_time and next_block is None:
                next_block = block

        # ── Next prayer block ─────────────────────────────────────────────────
        prayer_keywords = ["fajr", "dhuhr", "asr", "maghrib", "isha", "prayer"]
        upcoming_prayer = None
        minutes_to_prayer = None
        for block in blocks:
            if any(kw in block.label.lower() for kw in prayer_keywords):
                if block.time > current_time:
                    import datetime as _dt  # noqa: PLC0415
                    diff = _dt.datetime.combine(today, block.time) - _dt.datetime.combine(today, current_time)
                    upcoming_prayer = block.label
                    minutes_to_prayer = int(diff.total_seconds() // 60)
                    break

        # ── Highest leverage unblocked node ──────────────────────────────────
        EFFORT_WEIGHT = {
            "15min": 1, "30min": 1, "1h": 1,
            "2h": 2, "4h": 2, "1day": 3,
            "2days": 3, "1week": 4, "ongoing": 2,
        }
        qs = Node.objects.exclude(status__in=["done", "deferred"]).prefetch_related("deps", "dependents")
        top_node = None
        best_score = -999
        for node in qs:
            dep_count = node.dependents.count()
            priority_val = node.priority or 3
            effort_w = EFFORT_WEIGHT.get(node.effort or "", 2)
            score = dep_count * 3 + (5 - priority_val) * 2 + (2 if node.status == "active" else 1) - effort_w
            if score > best_score:
                best_score = score
                top_node = {"id": str(node.id), "title": node.title, "type": node.type, "leverage_score": score, "dependent_count": dep_count}

        # ── Today's check-in status ───────────────────────────────────────────
        from core.models import DailyCheckIn  # noqa: PLC0415
        checkin = DailyCheckIn.objects.filter(date=today).first()
        morning_done = bool(checkin and checkin.morning_completed_at)
        evening_done = bool(checkin and checkin.evening_completed_at)

        # ── One-sentence instruction ──────────────────────────────────────────
        instruction = ""
        if top_node:
            block_label = current_block.label if current_block else (next_block.label if next_block else "your next block")
            instruction = (
                f"You're in your {block_label} block. "
                f"Your highest-leverage action is: {top_node['title']} — "
                f"completing it unblocks {top_node['dependent_count']} other item(s)."
            )

        def block_to_dict(b):
            if not b:
                return None
            return {"label": b.label, "type": b.type, "time": b.time.strftime("%H:%M"), "duration_minutes": b.duration_minutes}

        return Response({
            "current_block": block_to_dict(current_block),
            "next_block": block_to_dict(next_block),
            "top_node": top_node,
            "morning_done": morning_done,
            "evening_done": evening_done,
            "next_prayer": upcoming_prayer,
            "minutes_to_prayer": minutes_to_prayer,
            "instruction": instruction,
        })


class AlertsView(APIView):
    """GET /api/core/alerts/ — List unread + recent alerts (last 50).
    Also triggers a fresh alert generation run on each request so the bell
    is always up to date without waiting for the hourly cron.
    """

    def get(self, request):
        from django.utils import timezone  # noqa: PLC0415
        from core.alert_service import AlertService  # noqa: PLC0415

        # Lightweight on-demand generation (idempotent — won't create dupes)
        try:
            AlertService.generate()
        except Exception:  # noqa: BLE001
            pass  # Never block the response

        qs = Alert.objects.filter(
            dismissed_at__isnull=True,
        ).order_by("-created_at")[:50]

        serializer = AlertSerializer(qs, many=True)
        unread_count = Alert.objects.filter(dismissed_at__isnull=True, read=False).count()
        critical_count = Alert.objects.filter(dismissed_at__isnull=True, read=False, priority="critical").count()
        return Response({
            "alerts": serializer.data,
            "unread_count": unread_count,
            "critical_count": critical_count,
        })


class AlertCountView(APIView):
    """GET /api/core/alerts/count/ — Fast badge count (no generation)."""

    def get(self, request):
        unread_count = Alert.objects.filter(dismissed_at__isnull=True, read=False).count()
        critical_count = Alert.objects.filter(dismissed_at__isnull=True, read=False, priority="critical").count()
        return Response({"unread_count": unread_count, "critical_count": critical_count})


class AlertDetailView(APIView):
    """POST /api/core/alerts/{id}/read/  — mark as read
       POST /api/core/alerts/{id}/dismiss/ — dismiss permanently
    """

    def post(self, request, pk, action):
        from django.utils import timezone  # noqa: PLC0415

        try:
            alert = Alert.objects.get(pk=pk)
        except Alert.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        if action == "read":
            alert.read = True
            alert.save(update_fields=["read"])
        elif action == "dismiss":
            alert.dismissed_at = timezone.now()
            alert.read = True
            alert.save(update_fields=["dismissed_at", "read"])

        return Response(AlertSerializer(alert).data)


class AlertReadAllView(APIView):
    """POST /api/core/alerts/read-all/ — mark all undismissed alerts as read."""

    def post(self, request):
        Alert.objects.filter(dismissed_at__isnull=True, read=False).update(read=True)
        return Response({"ok": True})


class TelegramWebhookView(APIView):
    """POST endpoint for Telegram bot webhook — no auth required (Telegram posts without tokens)."""

    permission_classes = []
    authentication_classes = []

    def post(self, request):
        from core.telegram_bot import handle_webhook  # noqa: PLC0415

        handle_webhook(request.data)
        return Response({"ok": True})
