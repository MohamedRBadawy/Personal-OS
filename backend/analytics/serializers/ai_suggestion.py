"""Serializer for AI suggestion tracking."""
from rest_framework import serializers

from analytics.models.ai_suggestion import AISuggestion
from analytics.services import AISuggestionDisciplineService


class AISuggestionSerializer(serializers.ModelSerializer):
    """Serializer for AISuggestion records."""

    class Meta:
        model = AISuggestion
        fields = "__all__"
        read_only_fields = ["id", "shown_at"]

    def validate(self, attrs):
        topic = attrs.get("topic", self.instance.topic if self.instance else None)
        module = attrs.get("module", self.instance.module if self.instance else None)
        AISuggestionDisciplineService.validate(
            topic=topic,
            module=module,
            instance=self.instance,
        )
        return attrs
