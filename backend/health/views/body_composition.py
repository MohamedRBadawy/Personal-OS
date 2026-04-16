"""View for BodyCompositionLog — InBody scans and manual measurements."""
from rest_framework import viewsets

from health.models.body_composition import BodyCompositionLog
from health.serializers.body_composition import BodyCompositionLogSerializer


class BodyCompositionLogViewSet(viewsets.ModelViewSet):
    """CRUD for body composition snapshots. No pagination — all entries returned."""

    serializer_class = BodyCompositionLogSerializer
    pagination_class = None
    queryset = BodyCompositionLog.objects.all()
