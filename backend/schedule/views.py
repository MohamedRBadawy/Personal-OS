"""API views for the Schedule domain."""
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from schedule.models import ScheduleTemplate, ScheduleBlock, ScheduleLog
from schedule.serializers import (
    ScheduleTemplateSerializer,
    ScheduleBlockSerializer,
    ScheduleLogSerializer,
)
from schedule.services import TodayScheduleService


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
