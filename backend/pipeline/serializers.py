"""Serializers for pipeline records."""
from rest_framework import serializers

from pipeline.models import Client, MarketingAction, MarketingCampaign, MarketingChannel, Opportunity


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


class MarketingChannelSerializer(serializers.ModelSerializer):
    """Serializer for marketing presence channels."""

    class Meta:
        model = MarketingChannel
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class MarketingCampaignSerializer(serializers.ModelSerializer):
    """Serializer for structured marketing campaigns."""

    class Meta:
        model = MarketingCampaign
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class MarketingActionSerializer(serializers.ModelSerializer):
    """Serializer for outreach and visibility tracking."""

    class Meta:
        model = MarketingAction
        fields = "__all__"
        read_only_fields = ["id", "created_at"]
