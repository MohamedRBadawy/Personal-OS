"""Serializers for the Contacts domain."""
from rest_framework import serializers

from contacts.models import Contact


class ContactSerializer(serializers.ModelSerializer):
    """Full serializer for Contact, with computed follow-up fields."""

    followup_overdue = serializers.BooleanField(read_only=True)
    days_since_contact = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Contact
        fields = [
            "id", "name", "relation", "company", "email", "phone",
            "last_contact", "next_followup", "notes", "linked_node",
            "followup_overdue", "days_since_contact",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "followup_overdue", "days_since_contact"]
