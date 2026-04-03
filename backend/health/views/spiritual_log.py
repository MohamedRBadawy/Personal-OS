"""API view for SpiritualLog records."""
from rest_framework import viewsets

from health.models.spiritual_log import SpiritualLog
from health.serializers.spiritual_log import SpiritualLogSerializer


class SpiritualLogViewSet(viewsets.ModelViewSet):
    """CRUD API for daily SpiritualLog entries."""

    queryset = SpiritualLog.objects.all()
    serializer_class = SpiritualLogSerializer
