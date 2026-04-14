"""API views for Habit and HabitLog records."""
from datetime import date, timedelta

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from health.models.habit import Habit, HabitLog
from health.serializers.habit import HabitSerializer, HabitLogSerializer


class HabitViewSet(viewsets.ModelViewSet):
    """CRUD API for Habit definitions."""

    serializer_class = HabitSerializer

    def get_queryset(self):
        qs = Habit.objects.all()
        goal_id = self.request.query_params.get("goal")
        if goal_id:
            qs = qs.filter(goal_id=goal_id)
        return qs


class HabitLogViewSet(viewsets.ModelViewSet):
    """CRUD API for HabitLog — daily habit completion entries."""

    queryset = HabitLog.objects.all()
    serializer_class = HabitLogSerializer


class HabitHeatmapAPIView(APIView):
    """GET habit completion grid for the last 365 days.

    Returns:
        habits: list of {id, name} for all defined habits
        grid: { habit_id: { "YYYY-MM-DD": true|false, ... } } — keys are
              only dates where a log exists (completed=True)
        date_range: {start, end} bounding dates
    """

    def get(self, request):
        today = date.today()
        start = today - timedelta(days=364)

        habits = list(Habit.objects.all().values("id", "name"))

        # Fetch all logs in range
        logs = HabitLog.objects.filter(
            date__gte=start,
            date__lte=today,
            done=True,
        ).values("habit_id", "date")

        grid: dict[str, dict[str, bool]] = {}
        for log in logs:
            hid = str(log["habit_id"])
            if hid not in grid:
                grid[hid] = {}
            grid[hid][str(log["date"])] = True

        return Response({
            "habits": [{"id": str(h["id"]), "name": h["name"]} for h in habits],
            "grid": grid,
            "date_range": {"start": str(start), "end": str(today)},
        })
