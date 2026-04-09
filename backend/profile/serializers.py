"""Serializers for the profile app."""
from rest_framework import serializers

from .models import ProfileSection, UserProfile


class ProfileSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileSection
        fields = ["id", "title", "content", "order", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class UserProfileSerializer(serializers.ModelSerializer):
    sections = ProfileSectionSerializer(many=True, read_only=False, required=False)
    ai_context = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "full_name",
            "date_of_birth",
            "location",
            "personality_type",
            "religion",
            "weight_kg",
            "height_cm",
            "monthly_income",
            "income_currency",
            "monthly_expenses",
            "monthly_independent_income",
            "financial_target_monthly",
            "financial_target_currency",
            "total_debt",
            "debt_currency",
            "sections",
            "ai_context",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at", "ai_context"]

    def get_ai_context(self, obj) -> str:
        """Return a formatted plain-text summary suitable for pasting into an AI."""
        lines = ["=== PERSONAL PROFILE ==="]

        def add(label, value):
            if value is not None and str(value).strip():
                lines.append(f"{label}: {value}")

        add("Name", obj.full_name)
        add("Personality", obj.personality_type)
        add("Location", obj.location)
        add("Religion", obj.religion)
        if obj.date_of_birth:
            add("Date of Birth", str(obj.date_of_birth))
        if obj.weight_kg:
            add("Weight", f"{obj.weight_kg} kg")
        if obj.height_cm:
            add("Height", f"{obj.height_cm} cm")

        # Finance block
        lines.append("")
        lines.append("--- FINANCES ---")
        if obj.monthly_income is not None:
            add("Monthly Employment Income", f"{obj.monthly_income} {obj.income_currency}")
        if obj.monthly_expenses is not None:
            add("Monthly Expenses", f"{obj.monthly_expenses} {obj.income_currency}")
        if obj.monthly_independent_income is not None:
            add("Monthly Independent Income", f"{obj.monthly_independent_income} {obj.financial_target_currency}")
        if obj.financial_target_monthly is not None:
            add("Financial Target (monthly)", f"{obj.financial_target_monthly} {obj.financial_target_currency}")
        if obj.total_debt is not None:
            add("Total Debt", f"{obj.total_debt} {obj.debt_currency}")

        # Flexible sections
        for section in obj.sections.all():
            lines.append("")
            lines.append(f"=== {section.title.upper()} ===")
            if section.content.strip():
                lines.append(section.content.strip())
            else:
                lines.append("[not yet filled in]")

        return "\n".join(lines)

    def update(self, instance, validated_data):
        sections_data = validated_data.pop("sections", None)
        instance = super().update(instance, validated_data)

        if sections_data is not None:
            # Replace all sections
            instance.sections.all().delete()
            for idx, section in enumerate(sections_data):
                ProfileSection.objects.create(
                    profile=instance,
                    title=section.get("title", ""),
                    content=section.get("content", ""),
                    order=section.get("order", idx),
                )

        return instance
