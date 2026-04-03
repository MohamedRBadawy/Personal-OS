"""Serializers for pipeline records."""
from rest_framework import serializers

from pipeline.models import Client, MarketingAction, Opportunity


class ClientSerializer(serializers.ModelSerializer):
    """Serializer for downstream client records."""

    class Meta:
        model = Client
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class OpportunitySerializer(serializers.ModelSerializer):
    """Serializer for freelance leads and proposals."""

    class Meta:
        model = Opportunity
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class MarketingActionSerializer(serializers.ModelSerializer):
    """Serializer for outreach and visibility tracking."""

    class Meta:
        model = MarketingAction
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
