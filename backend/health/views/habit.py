"""API views for Habit and HabitLog records."""
from rest_framework import viewsets

from health.models.habit import Habit, HabitLog
from health.serializers.habit import HabitSerializer, HabitLogSerializer


class HabitViewSet(viewsets.ModelViewSet):
    """CRUD API for Habit definitions."""

    queryset = Habit.objects.all()
    serializer_class = HabitSerializer


class HabitLogViewSet(viewsets.ModelViewSet):
    """CRUD API for HabitLog — daily habit completion entries."""

    queryset = HabitLog.objects.all()
    serializer_class = HabitLogSerializer
