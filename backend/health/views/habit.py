"""API views for Habit and HabitLog records."""
from rest_framework import viewsets

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
