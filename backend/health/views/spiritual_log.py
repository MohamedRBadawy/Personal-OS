"""API view for SpiritualLog records."""
from datetime import date, timedelta

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from health.models.spiritual_log import SpiritualLog
from health.serializers.spiritual_log import SpiritualLogSerializer

PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"]


class SpiritualLogViewSet(viewsets.ModelViewSet):
    """CRUD API for daily SpiritualLog entries."""

    queryset = SpiritualLog.objects.all()
    serializer_class = SpiritualLogSerializer


class SpiritualHeatmapAPIView(APIView):
    """GET prayer completion grid for the last 30 days.

    Returns:
        dates: list of "YYYY-MM-DD" strings (last 30 days, ascending)
        grid: { "YYYY-MM-DD": { fajr: bool, dhuhr: bool, asr: bool, maghrib: bool, isha: bool } }
        stats: per-prayer completion counts + full_prayer_days count
    """

    def get(self, request):
        today = date.today()
        start = today - timedelta(days=29)

        logs = SpiritualLog.objects.filter(date__gte=start, date__lte=today)

        grid: dict[str, dict[str, bool]] = {}
        for log in logs:
            grid[str(log.date)] = {p: getattr(log, p) for p in PRAYERS}

        # Build ordered date list
        dates = [(start + timedelta(days=i)).isoformat() for i in range(30)]

        # Stats
        prayer_counts = {p: 0 for p in PRAYERS}
        full_days = 0
        for day_str, prayers in grid.items():
            if all(prayers.values()):
                full_days += 1
            for p in PRAYERS:
                if prayers.get(p):
                    prayer_counts[p] += 1

        return Response({
            "dates": dates,
            "grid": grid,
            "stats": {
                "full_prayer_days": full_days,
                "prayer_counts": prayer_counts,
                "days_tracked": len(grid),
            },
        })
