# [AR] سيريالايزرز خط الأنابيب — تحويل نماذج الفرص والتسويق والشراكات إلى JSON
# [EN] Pipeline serializers — convert opportunity, marketing, and partnership models to JSON

from rest_framework import serializers

from pipeline.models import (
    Client, EquityPartnership, MarketingAction, MarketingCampaign,
    MarketingChannel, Opportunity, OutreachStep, PartnershipAction,
)


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


# [AR] سيريالايزر خطوات التواصل — يعرض سجل خطوات التواصل لكل فرصة
# [EN] Outreach step serializer — exposes the step timeline per opportunity
class OutreachStepSerializer(serializers.ModelSerializer):
    """Serializer for a single outreach step in the opportunity timeline."""

    class Meta:
        model = OutreachStep
        fields = ["id", "step_type", "date", "notes", "draft_message", "created_at"]
        read_only_fields = ["id", "created_at"]


# [AR] سيريالايزر إجراءات الشراكة — يتتبع الإجراءات القادمة والمكتملة
# [EN] Partnership action serializer — tracks pending and completed actions per partnership
class PartnershipActionSerializer(serializers.ModelSerializer):
    """Serializer for a single action within an equity partnership."""

    class Meta:
        model = PartnershipAction
        fields = ["id", "description", "completed_at", "is_current_next_action", "created_at"]
        read_only_fields = ["id", "created_at"]


# [AR] سيريالايزر الشراكات الرأسمالية — يشمل الإجراء الحالي مضمَّناً
# [EN] Equity partnership serializer — includes current next action inline
class EquityPartnershipSerializer(serializers.ModelSerializer):
    """Serializer for equity partnerships with the current next action nested."""

    current_next_action = serializers.SerializerMethodField()

    class Meta:
        model = EquityPartnership
        fields = [
            "id", "partner_name", "business_name", "business_type",
            "equity_pct", "status", "terms_notes", "current_next_action",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_current_next_action(self, obj):
        action = obj.actions.filter(is_current_next_action=True).first()
        if action:
            return PartnershipActionSerializer(action).data
        return None
