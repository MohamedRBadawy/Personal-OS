from django.contrib import admin

from .models import ProfileSection, UserProfile


class ProfileSectionInline(admin.TabularInline):
    model = ProfileSection
    extra = 0
    fields = ["title", "content", "order"]
    ordering = ["order", "id"]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    inlines = [ProfileSectionInline]
    list_display = ["full_name", "personality_type", "location", "updated_at"]
    fieldsets = [
        ("Identity", {
            "fields": ["full_name", "date_of_birth", "location", "personality_type", "religion"],
        }),
        ("Physical", {
            "fields": ["weight_kg", "height_cm"],
        }),
        ("Finances", {
            "fields": [
                "monthly_income", "income_currency",
                "monthly_expenses",
                "monthly_independent_income",
                "financial_target_monthly", "financial_target_currency",
                "total_debt", "debt_currency",
            ],
        }),
    ]


@admin.register(ProfileSection)
class ProfileSectionAdmin(admin.ModelAdmin):
    list_display = ["title", "profile", "order", "updated_at"]
    list_filter = ["profile"]
    ordering = ["order", "id"]
