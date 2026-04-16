"""Serializer for BodyCompositionLog."""
from rest_framework import serializers

from health.models.body_composition import BodyCompositionLog


class BodyCompositionLogSerializer(serializers.ModelSerializer):
    lean_mass_kg = serializers.SerializerMethodField()

    class Meta:
        model = BodyCompositionLog
        fields = "__all__"
        read_only_fields = ["id", "created_at"]

    def get_lean_mass_kg(self, obj):
        """Lean mass = weight - fat mass (when both are available)."""
        if obj.weight_kg is not None and obj.fat_mass_kg is not None:
            return round(float(obj.weight_kg) - float(obj.fat_mass_kg), 2)
        return None
