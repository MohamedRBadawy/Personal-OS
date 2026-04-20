# [AR] نماذج الملف الشخصي — الملف الشخصي الفردي وأقسامه القابلة للتعديل
# [EN] Profile models — singleton user profile and editable profile sections
from django.db import models


class UserProfile(models.Model):
    """Singleton model representing the owner's personal profile.

    At most one row should exist. Use get_or_create_singleton() to access it.
    """

    # Personal identity
    full_name = models.CharField(max_length=200, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    personality_type = models.CharField(max_length=20, blank=True, default="INTP")
    religion = models.CharField(max_length=100, blank=True)

    # Physical
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)

    # Finance snapshot
    monthly_income = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Employment/primary income per month",
    )
    income_currency = models.CharField(max_length=3, default="EUR")
    monthly_expenses = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    monthly_independent_income = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, default=0,
        help_text="Passive / semi-passive income per month",
    )
    financial_target_monthly = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, default=1000,
        help_text="Monthly independent income target",
    )
    financial_target_currency = models.CharField(max_length=3, default="EUR")
    total_debt = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    debt_currency = models.CharField(max_length=3, default="EGP")

    # [AR] إعدادات النجمة الشمالية — الهدف المحوري القابل للتخصيص
    # [EN] North star config — user-configurable primary goal metric
    north_star_label = models.CharField(
        max_length=100, blank=True,
        help_text="Display label for the north star metric (e.g. 'Monthly independent income')",
    )
    north_star_target_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Target amount (falls back to financial_target_monthly if null)",
    )
    north_star_currency = models.CharField(
        max_length=10, default="EUR",
        help_text="Currency symbol or code for north star display",
    )
    north_star_unit = models.CharField(
        max_length=50, default="per month",
        help_text="Unit label shown after the amount (e.g. 'per month')",
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profile"

    def __str__(self):
        return self.full_name or "Profile"

    @classmethod
    def get_or_create_singleton(cls):
        """Return the single profile instance, creating it if necessary."""
        instance, _ = cls.objects.get_or_create(pk=1)
        return instance


class ProfileSection(models.Model):
    """A flexible, user-editable section within the profile (e.g. Family, End Goals)."""

    profile = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Profile Section"
        verbose_name_plural = "Profile Sections"

    def __str__(self):
        return f"{self.profile} — {self.title}"
