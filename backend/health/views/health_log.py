"""API view for HealthLog records."""
from rest_framework import viewsets

from health.models.health_log import HealthLog
from health.serializers.health_log import HealthLogSerializer


class HealthLogViewSet(viewsets.ModelViewSet):
    """CRUD API for daily HealthLog entries."""

    queryset = HealthLog.objects.all()
    serializer_class = HealthLogSerializer
