"""API view for MoodLog records."""
from rest_framework import viewsets

from health.models.mood_log import MoodLog
from health.serializers.mood_log import MoodLogSerializer


class MoodLogViewSet(viewsets.ModelViewSet):
    """CRUD API for daily MoodLog entries."""

    queryset = MoodLog.objects.all()
    serializer_class = MoodLogSerializer
