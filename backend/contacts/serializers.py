"""Serializers for the Contacts domain."""
from rest_framework import serializers

from contacts.models import Contact, ContactInteraction


class ContactInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactInteraction
        fields = ["id", "contact", "date", "type", "summary", "outcome", "created_at"]
        read_only_fields = ["id", "created_at"]


class ContactSerializer(serializers.ModelSerializer):
    """Full serializer for Contact, with computed follow-up fields."""

    followup_overdue = serializers.BooleanField(read_only=True)
    days_since_contact = serializers.IntegerField(read_only=True, allow_null=True)
    interactions = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "id", "name", "relation", "company", "email", "phone",
            "last_contact", "next_followup", "notes", "linked_node",
            "crm_stage", "source", "linked_opportunity",
            "followup_overdue", "days_since_contact",
            "interactions",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "followup_overdue", "days_since_contact", "interactions"]

    def get_interactions(self, obj):
        qs = obj.interactions.all()[:5]
        return ContactInteractionSerializer(qs, many=True).data
