"""API views for the Schedule domain."""
from rest_framework import serializers as drf_serializers
from rest_framework import status as drf_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from schedule.models import RoutineBlock, RoutineLog, ScheduleBlock, ScheduleLog, ScheduleTemplate, ScheduledEntry
from schedule.serializers import (
    ScheduleBlockSerializer,
    ScheduleLogSerializer,
    ScheduleTemplateSerializer,
    ScheduledEntrySerializer,
)
from schedule.services import TodayScheduleService


# ── RoutineBlock ──────────────────────────────────────────────────────────────

class RoutineBlockSerializer(drf_serializers.ModelSerializer):
    time_str = drf_serializers.SerializerMethodField()
    linked_node_title = drf_serializers.SerializerMethodField()
    linked_node_progress = drf_serializers.SerializerMethodField()

    class Meta:
        model = RoutineBlock
        fields = [
            "id", "time", "time_str", "label", "type",
            "duration_minutes", "is_fixed", "order", "active",
            "linked_node", "linked_node_title", "linked_node_progress",
            "importance",
            # detail fields
            "description", "days_of_week",
            "location", "target",
            "exercise_type", "intensity",
            "focus_area", "deliverable",
        ]

    def get_time_str(self, obj) -> str:
        return obj.time.strftime("%H:%M")

    def get_linked_node_title(self, obj) -> str | None:
        return obj.linked_node.title if obj.linked_node_id else None

    def get_linked_node_progress(self, obj) -> int | None:
        return obj.linked_node.progress if obj.linked_node_id else None


class RoutineBlockViewSet(viewsets.ModelViewSet):
    """CRUD for user-editable routine blocks."""
    serializer_class = RoutineBlockSerializer
    pagination_class = None   # max 25 blocks — return full array

    def get_queryset(self):
        qs = RoutineBlock.objects.filter(active=True).order_by("order", "time")
        node_id = self.request.query_params.get("linked_node")
        if node_id:
            qs = qs.filter(linked_node_id=node_id)
        return qs

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """Accept [{id, order}, ...] and bulk-update sort order."""
        items = request.data
        if not isinstance(items, list):
            return Response({"error": "Expected a list"}, status=drf_status.HTTP_400_BAD_REQUEST)
        for item in items:
            RoutineBlock.objects.filter(pk=item["id"]).update(order=item["order"])
        return Response({"ok": True})


class ScheduleTemplateViewSet(viewsets.ModelViewSet):
    """CRUD API for schedule templates."""

    queryset = ScheduleTemplate.objects.all()
    serializer_class = ScheduleTemplateSerializer


class ScheduleBlockViewSet(viewsets.ModelViewSet):
    """CRUD API for schedule blocks."""

    queryset = ScheduleBlock.objects.all()
    serializer_class = ScheduleBlockSerializer


class ScheduleLogViewSet(viewsets.ModelViewSet):
    """CRUD API for schedule logs."""

    queryset = ScheduleLog.objects.select_related("block", "task_node").all()
    serializer_class = ScheduleLogSerializer


class TodayScheduleAPIView(APIView):
    """Expose a single read model for the active daily schedule."""

    def get(self, request):
        return Response(TodayScheduleService.payload())

class RoutineLogSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = RoutineLog
        fields = ["id", "date", "block_time", "status", "actual_time", "note", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class RoutineLogView(APIView):
    """GET ?date=YYYY-MM-DD returns all logs for that day. POST creates/updates a single entry."""

    def get(self, request):
        date = request.query_params.get("date")
        if not date:
            from django.utils import timezone
            date = timezone.localdate().isoformat()
        logs = RoutineLog.objects.filter(date=date)
        serializer = RoutineLogSerializer(logs, many=True)
        return Response(serializer.data)

    def post(self, request):
        date = request.data.get("date")
        block_time = request.data.get("block_time") or request.data.get("time")
        if not date or not block_time:
            return Response({"error": "date and block_time required"}, status=drf_status.HTTP_400_BAD_REQUEST)
        obj, _ = RoutineLog.objects.get_or_create(date=date, block_time=block_time)
        serializer = RoutineLogSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=drf_status.HTTP_200_OK)


class RoutineNotesView(APIView):
    """GET ?block_time=HH:MM&limit=10 — recent logs with non-empty notes for a given block."""

    def get(self, request):
        block_time = request.query_params.get("block_time", "")
        limit = min(int(request.query_params.get("limit", 10)), 50)
        if not block_time:
            return Response({"error": "block_time required"}, status=drf_status.HTTP_400_BAD_REQUEST)

        logs = (
            RoutineLog.objects
            .filter(block_time__startswith=block_time, note__isnull=False)
            .exclude(note="")
            .order_by("-date")[:limit]
        )
        data = [
            {
                "date": str(log.date),
                "status": log.status,
                "actual_time": str(log.actual_time)[:5] if log.actual_time else None,
                "note": log.note,
            }
            for log in logs
        ]
        return Response(data)


class RoutineStreakView(APIView):
    """Return how many consecutive past days had >= 80% routine completion."""

    THRESHOLD = 0.8

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone

        total = RoutineBlock.objects.filter(active=True).count() or 20
        today = timezone.localdate()
        today_done = RoutineLog.objects.filter(date=today, status__in=["done", "partial"]).count()
        today_complete = (today_done / total) >= self.THRESHOLD
        start_offset = 0 if today_complete else 1

        streak = 0
        for i in range(start_offset, 60):
            date = today - timedelta(days=i)
            done = RoutineLog.objects.filter(date=date, status__in=["done", "partial"]).count()
            if (done / total) >= self.THRESHOLD:
                streak += 1
            else:
                break

        return Response({"streak": streak, "total_blocks": total})


class RoutineBriefingView(APIView):
    """POST — generate a concise routine briefing for today using Claude.

    Assembles today's block schedule + yesterday's completion summary, then
    calls Claude for a 3-bullet focus card. Falls back to a deterministic
    summary if the AI call fails.

    Response: {briefing: str, fallback: bool}
    """

    def post(self, request):
        from django.utils import timezone
        from datetime import timedelta

        today = timezone.localdate()
        yesterday = today - timedelta(days=1)

        # Today's blocks
        blocks = list(RoutineBlock.objects.filter(active=True).order_by("order", "time").values(
            "time", "label", "type", "importance", "duration_minutes",
            "description", "location", "target", "exercise_type", "intensity",
            "focus_area", "deliverable",
        ))

        # Yesterday's logs for completion context
        yesterday_logs = list(RoutineLog.objects.filter(date=yesterday).values("block_time", "status", "note"))
        y_done = sum(1 for l in yesterday_logs if l["status"] in ("done", "partial"))
        y_total = len(blocks)
        y_pct = round(100 * y_done / y_total) if y_total else 0

        # Today's already-logged entries
        today_logs = list(RoutineLog.objects.filter(date=today).values("block_time", "status"))
        today_done = {str(l["block_time"])[:5] for l in today_logs if l["status"] in ("done", "partial")}

        # Current Cairo time
        import datetime
        cairo_now = datetime.datetime.now(tz=timezone.get_current_timezone()).strftime("%H:%M")

        # Build schedule summary for prompt
        must_blocks = [b for b in blocks if b.get("importance") == "must"]
        remaining = [b for b in blocks if str(b["time"])[:5] not in today_done]

        schedule_lines = []
        for b in blocks[:15]:  # cap to keep prompt lean
            t = str(b["time"])[:5]
            imp = b.get("importance", "should")
            status = "✓ done" if t in today_done else "pending"
            detail = b.get("location") or b.get("exercise_type") or b.get("focus_area") or ""
            line = f"  {t} [{imp.upper()}] {b['label']} ({b['duration_minutes']}min){' — ' + detail if detail else ''} {status}"
            schedule_lines.append(line)

        yesterday_notes = [l["note"] for l in yesterday_logs if l.get("note")]

        prompt = f"""You are a personal productivity coach. Give a concise routine briefing for today.

Current Cairo time: {cairo_now}
Yesterday's completion: {y_done}/{y_total} blocks ({y_pct}%)
{f"Yesterday's notes: {'; '.join(yesterday_notes[:3])}" if yesterday_notes else "No notes from yesterday."}

Today's routine ({len(blocks)} blocks, {len(today_done)} done so far):
{chr(10).join(schedule_lines)}

Must-do blocks (rated MUST): {', '.join(b['label'] for b in must_blocks) or 'none set'}
Remaining blocks: {len(remaining)}

Respond with EXACTLY 3 bullets (use • prefix). Each bullet max 15 words. Tone: direct, motivating, no fluff.
Focus on: (1) what matters most right now, (2) any risk/pattern to watch, (3) one concrete focus for the next 2 hours."""

        # Try Claude
        try:
            from config import settings as project_settings
            ai_config = project_settings.get_ai_runtime_config()
            provider_name = ai_config.get("provider", "")

            briefing_text = None

            if provider_name == "anthropic":
                try:
                    from anthropic import Anthropic
                    client = Anthropic(api_key=ai_config.get("api_key", ""))
                    msg = client.messages.create(
                        model=ai_config.get("model", "claude-haiku-4-5-20251001"),
                        max_tokens=256,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    briefing_text = msg.content[0].text if msg.content else None
                except Exception:
                    pass

            if briefing_text is None:
                # Deterministic fallback
                lines = []
                if must_blocks:
                    next_must = next((b for b in must_blocks if str(b["time"])[:5] not in today_done), None)
                    if next_must:
                        lines.append(f"• Your next MUST block: {next_must['label']} at {str(next_must['time'])[:5]}.")
                    else:
                        lines.append(f"• All {len(must_blocks)} must-do block(s) completed — solid foundation.")
                else:
                    lines.append(f"• {len(today_done)}/{len(blocks)} blocks done — keep momentum.")
                if y_pct < 60:
                    lines.append(f"• Yesterday was {y_pct}% — reset today with a strong start.")
                else:
                    lines.append(f"• Yesterday {y_pct}% — carry that momentum forward.")
                lines.append(f"• {len(remaining)} blocks remaining today — stay consistent.")
                briefing_text = "\n".join(lines[:3])
                return Response({"briefing": briefing_text, "fallback": True})

            return Response({"briefing": briefing_text, "fallback": False})

        except Exception as exc:
            return Response({"briefing": f"• Could not generate briefing: {exc}", "fallback": True})


class RoutineAnalyticsView(APIView):
    """Deep per-day and per-block analytics over a lookback window.

    Query params:
      days (int, default 90, clamped 7-365)

    Response:
      daily        — [{date, total, done, partial, late, skipped, pct}, …]
      by_type      — {spiritual: {rate, done, partial, late, skipped, total}, …}
      block_stats  — [{block_id, label, type, time_str, done, partial, late,
                       skipped, total_days, rate, avg_drift_minutes}, …]
                     sorted by rate ascending (worst performers first)
    """

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone

        days = int(request.query_params.get("days", 90))
        days = min(max(days, 7), 365)

        today = timezone.localdate()
        start = today - timedelta(days=days - 1)

        # Active blocks
        blocks = list(RoutineBlock.objects.filter(active=True).values("id", "time", "label", "type"))
        total_blocks = len(blocks)

        # "HH:MM" -> block dict
        block_by_time: dict[str, dict] = {}
        for b in blocks:
            block_by_time[str(b["time"])[:5]] = b

        # All logs in window
        logs = list(RoutineLog.objects.filter(
            date__gte=start, date__lte=today,
        ).values("date", "block_time", "status", "actual_time"))

        # ── Daily ─────────────────────────────────────────────
        daily_map: dict = {}
        for i in range(days):
            d = today - timedelta(days=days - 1 - i)
            daily_map[d] = {"date": d.isoformat(), "total": total_blocks,
                            "done": 0, "partial": 0, "late": 0, "skipped": 0}

        for log in logs:
            d = log["date"]
            if d in daily_map and log["status"] in ("done", "partial", "late", "skipped"):
                daily_map[d][log["status"]] += 1

        daily = []
        for entry in daily_map.values():
            completed = entry["done"] + entry["partial"]
            entry["pct"] = round(100 * completed / total_blocks) if total_blocks else 0
            daily.append(entry)

        # ── By type ───────────────────────────────────────────
        type_data: dict[str, dict] = {}
        for b in blocks:
            t = b["type"]
            if t not in type_data:
                type_data[t] = {"done": 0, "partial": 0, "late": 0, "skipped": 0, "total": 0}
            type_data[t]["total"] += days

        for log in logs:
            b = block_by_time.get(str(log["block_time"])[:5])
            if b and log["status"] in ("done", "partial", "late", "skipped"):
                type_data[b["type"]][log["status"]] += 1

        by_type = {}
        for t, stats in type_data.items():
            completed = stats["done"] + stats["partial"]
            by_type[t] = {**stats, "rate": round(100 * completed / stats["total"]) if stats["total"] else 0}

        # ── Per-block ─────────────────────────────────────────
        bs_map: dict[str, dict] = {}
        for b in blocks:
            t_str = str(b["time"])[:5]
            bs_map[t_str] = {
                "block_id": b["id"], "label": b["label"],
                "type": b["type"], "time_str": t_str,
                "done": 0, "partial": 0, "late": 0, "skipped": 0,
                "total_days": days, "_drift_sum": 0, "_drift_n": 0,
            }

        for log in logs:
            t_str = str(log["block_time"])[:5]
            if t_str not in bs_map:
                continue
            bs = bs_map[t_str]
            if log["status"] in ("done", "partial", "late", "skipped"):
                bs[log["status"]] += 1
            if log["actual_time"]:
                try:
                    at = str(log["actual_time"])[:5]
                    ah, am = map(int, at.split(":"))
                    sh, sm = map(int, t_str.split(":"))
                    drift = (ah * 60 + am) - (sh * 60 + sm)
                    if -60 <= drift <= 360:
                        bs["_drift_sum"] += drift
                        bs["_drift_n"] += 1
                except (ValueError, AttributeError):
                    pass

        block_stats = []
        for bs in bs_map.values():
            completed = bs["done"] + bs["partial"]
            rate = round(100 * completed / bs["total_days"]) if bs["total_days"] else 0
            avg_drift = round(bs["_drift_sum"] / bs["_drift_n"]) if bs["_drift_n"] else None
            block_stats.append({
                "block_id": bs["block_id"], "label": bs["label"],
                "type": bs["type"], "time_str": bs["time_str"],
                "done": bs["done"], "partial": bs["partial"],
                "late": bs["late"], "skipped": bs["skipped"],
                "total_days": bs["total_days"], "rate": rate,
                "avg_drift_minutes": avg_drift,
            })

        block_stats.sort(key=lambda x: x["rate"])

        # ── By weekday × type ─────────────────────────────────
        # Structure: {type: {weekday_digit: {done, total}}, ...}
        # weekday digits: 1=Mon … 7=Sun (Python isoweekday())
        wd_data: dict[str, dict[str, dict]] = {}
        for b in blocks:
            t = b["type"]
            if t not in wd_data:
                wd_data[t] = {str(d): {"done": 0, "total": 0} for d in range(1, 8)}

        # Count occurrences of each (type, weekday) in the window for denominator
        from datetime import timedelta as _td
        for i in range(days):
            d = today - _td(days=days - 1 - i)
            wd = str(d.isoweekday())  # 1=Mon … 7=Sun
            for b in blocks:
                if b["type"] in wd_data:
                    wd_data[b["type"]][wd]["total"] += 1

        for log in logs:
            b = block_by_time.get(str(log["block_time"])[:5])
            if not b:
                continue
            if log["status"] not in ("done", "partial"):
                continue
            btype = b["type"]
            if btype not in wd_data:
                continue
            log_date = log["date"]  # date object
            wd = str(log_date.isoweekday())
            wd_data[btype][wd]["done"] += 1

        by_weekday: dict[str, dict[str, int]] = {}
        for t, wds in wd_data.items():
            by_weekday[t] = {}
            for wd, counts in wds.items():
                rate = round(100 * counts["done"] / counts["total"]) if counts["total"] else 0
                by_weekday[t][wd] = rate

        return Response({"days": days, "daily": daily, "by_type": by_type, "block_stats": block_stats, "by_weekday": by_weekday})


class RoutineMetricsView(APIView):
    """Return spiritual (prayer) and health (exercise) adherence stats over the last N days.

    Query params:
      days (int, default 30, clamped 7-90) — lookback window.

    Response:
      prayer_rate        — % of spiritual block slots completed (done/partial)
      prayer_streak      — consecutive days (before today) all spiritual blocks done
      prayer_blocks_per_day — active spiritual blocks count
      exercise_rate      — % of health block slots completed
      exercise_streak    — consecutive days (before today) with ≥1 health block done
      exercise_blocks_per_day — active health blocks count
      days               — lookback window used
    """

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone

        days = int(request.query_params.get("days", 30))
        days = min(max(days, 7), 90)

        today = timezone.localdate()
        start = today - timedelta(days=days - 1)

        # Collect active block times by type
        blocks_by_type: dict[str, list] = {}
        for block in RoutineBlock.objects.filter(active=True).values("type", "time"):
            blocks_by_type.setdefault(block["type"], []).append(block["time"])

        spiritual_times = blocks_by_type.get("spiritual", [])
        health_times = blocks_by_type.get("health", [])

        # Pre-fetch completed logs in window into a set for O(1) lookups
        completed_logs = RoutineLog.objects.filter(
            date__gte=start, date__lte=today,
            status__in=["done", "partial"],
        ).values_list("date", "block_time")
        done_set = set(completed_logs)

        prayer_done = prayer_total = 0
        exercise_done = exercise_total = 0
        prayer_streak = exercise_streak = 0
        prayer_streak_on = exercise_streak_on = True

        for i in range(days):
            d = today - timedelta(days=i)

            # Spiritual / prayer
            day_p = sum(1 for t in spiritual_times if (d, t) in done_set)
            prayer_done += day_p
            prayer_total += len(spiritual_times)
            if i >= 1 and prayer_streak_on:
                if spiritual_times and day_p == len(spiritual_times):
                    prayer_streak += 1
                else:
                    prayer_streak_on = False

            # Health / exercise
            day_e = sum(1 for t in health_times if (d, t) in done_set)
            exercise_done += day_e
            exercise_total += len(health_times)
            if i >= 1 and exercise_streak_on:
                if health_times and day_e > 0:
                    exercise_streak += 1
                else:
                    exercise_streak_on = False

        prayer_rate = round(100 * prayer_done / prayer_total) if prayer_total else 0
        exercise_rate = round(100 * exercise_done / exercise_total) if exercise_total else 0

        return Response({
            "days": days,
            "prayer_rate": prayer_rate,
            "prayer_streak": prayer_streak,
            "prayer_blocks_per_day": len(spiritual_times),
            "exercise_rate": exercise_rate,
            "exercise_streak": exercise_streak,
            "exercise_blocks_per_day": len(health_times),
        })


# ── ScheduledEntry ────────────────────────────────────────────────────────────

class ScheduledEntryViewSet(viewsets.ModelViewSet):
    """CRUD for one-off scheduled goal task entries on the day calendar."""

    serializer_class = ScheduledEntrySerializer
    pagination_class = None  # return plain list, not {count, results}

    def get_queryset(self):
        qs = ScheduledEntry.objects.select_related("node").all()
        date = self.request.query_params.get("date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date:
            qs = qs.filter(date=date)
        elif date_from and date_to:
            qs = qs.filter(date__gte=date_from, date__lte=date_to)
        return qs
