"""Views for the Journal domain.

Endpoints:
  GET  /api/journal/entries/         — list (30 most recent)
  POST /api/journal/entries/         — create
  GET  /api/journal/entries/{id}/    — retrieve by id
  PUT  /api/journal/entries/{id}/    — full update
  PATCH /api/journal/entries/{id}/   — partial update
  GET  /api/journal/today/           — get or create today's entry
"""
import datetime

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from journal.models import JournalEntry
from journal.serializers import JournalEntrySerializer


class JournalEntryViewSet(ModelViewSet):
    """CRUD for JournalEntry. Returns 30 most recent entries."""

    serializer_class = JournalEntrySerializer

    def get_queryset(self):
        return JournalEntry.objects.all()[:30]


class JournalTodayView(APIView):
    """GET or upsert today's journal entry.

    GET  → returns today's entry (or empty shell with today's date)
    POST → upsert (create or update) today's entry
    """

    def get(self, request):
        today = datetime.date.today()
        entry, _ = JournalEntry.objects.get_or_create(date=today)
        return Response(JournalEntrySerializer(entry).data)

    def post(self, request):
        today = datetime.date.today()
        entry, _ = JournalEntry.objects.get_or_create(date=today)
        serializer = JournalEntrySerializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
