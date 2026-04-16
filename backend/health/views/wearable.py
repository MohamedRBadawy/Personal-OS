"""View for WearableLog — daily smartwatch data."""
from rest_framework import viewsets

from health.models.wearable import WearableLog
from health.serializers.wearable import WearableLogSerializer


class WearableLogViewSet(viewsets.ModelViewSet):
    """CRUD for daily wearable data. No pagination — all entries returned."""

    serializer_class = WearableLogSerializer
    pagination_class = None
    queryset = WearableLog.objects.all()
