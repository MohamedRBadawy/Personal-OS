"""Serializers for the Journal domain."""
from rest_framework import serializers

from journal.models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    """Full serializer for JournalEntry — used for list, retrieve, create, update."""

    class Meta:
        model = JournalEntry
        fields = [
            "id", "date", "mood_note", "gratitude", "wins",
            "tomorrow_focus", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
