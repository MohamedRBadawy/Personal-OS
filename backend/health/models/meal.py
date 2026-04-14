"""Meal planning and logging models."""
from django.db import models
from config.base_model import BaseModel


class MealPlan(BaseModel):
    """A planned meal for a specific day and slot."""

    class MealSlot(models.TextChoices):
        BREAKFAST = 'breakfast', 'Breakfast'
        LUNCH     = 'lunch',     'Lunch'
        DINNER    = 'dinner',    'Dinner'
        SNACK     = 'snack',     'Snack'

    date      = models.DateField(db_index=True)
    slot      = models.CharField(max_length=10, choices=MealSlot.choices)
    name      = models.CharField(max_length=200, help_text="Meal name, e.g. 'Oatmeal with berries'")

    # Macros
    calories  = models.PositiveIntegerField(null=True, blank=True)
    protein_g = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    fat_g     = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    carbs_g   = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    fiber_g   = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)

    # Micros as % of daily value — flexible JSON dicts
    # e.g. {"A": 15, "C": 80, "D": 40, "B12": 25}
    vitamins  = models.JSONField(default=dict, blank=True,
                   help_text="Vitamin %DV: keys like A, C, D, B12, folate, etc.")
    # e.g. {"iron": 20, "calcium": 15, "magnesium": 10}
    minerals  = models.JSONField(default=dict, blank=True,
                   help_text="Mineral %DV: keys like iron, calcium, magnesium, zinc, etc.")

    notes     = models.TextField(blank=True)

    class Meta:
        ordering = ['date', 'slot']

    def __str__(self):
        return f"{self.date} {self.slot}: {self.name}"


class MealLog(BaseModel):
    """Records what actually happened vs. the plan for one meal slot."""

    class EatStatus(models.TextChoices):
        AS_PLANNED      = 'as_planned',      'As planned'
        ATE_LESS        = 'ate_less',         'Ate less'
        ATE_MORE        = 'ate_more',         'Ate more'
        ATE_DIFFERENTLY = 'ate_differently',  'Ate differently'
        SKIPPED         = 'skipped',          'Skipped'

    plan   = models.OneToOneField(
        MealPlan, on_delete=models.CASCADE, related_name='log',
        null=True, blank=True,
        help_text="The planned meal this log records against (null = unplanned meal).",
    )
    date   = models.DateField(db_index=True)
    slot   = models.CharField(max_length=10, choices=MealPlan.MealSlot.choices)
    status = models.CharField(max_length=20, choices=EatStatus.choices)
    notes  = models.TextField(blank=True)

    class Meta:
        ordering = ['date', 'slot']

    def __str__(self):
        return f"{self.date} {self.slot} — {self.get_status_display()}"


class MealTemplate(BaseModel):
    """A reusable meal template — same fields as MealPlan but without a date."""

    slot      = models.CharField(max_length=10, choices=MealPlan.MealSlot.choices)
    name      = models.CharField(max_length=200)

    calories  = models.PositiveIntegerField(null=True, blank=True)
    protein_g = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    fat_g     = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    carbs_g   = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    fiber_g   = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)

    vitamins  = models.JSONField(default=dict, blank=True)
    minerals  = models.JSONField(default=dict, blank=True)
    notes     = models.TextField(blank=True)

    class Meta:
        ordering = ['slot', 'name']

    def __str__(self):
        return f"[Template] {self.slot}: {self.name}"


class FoodItem(BaseModel):
    """Personal food library — stores macros per 100g for reuse across meals."""

    class Category(models.TextChoices):
        PROTEIN   = 'protein',   'Protein'
        GRAIN     = 'grain',     'Grain & Starch'
        VEGETABLE = 'vegetable', 'Vegetable'
        FRUIT     = 'fruit',     'Fruit'
        DAIRY     = 'dairy',     'Dairy'
        LEGUME    = 'legume',    'Legume'
        NUT       = 'nut',       'Nut & Seed'
        FAT       = 'fat',       'Fat & Oil'
        BEVERAGE  = 'beverage',  'Beverage'
        OTHER     = 'other',     'Other'

    name                    = models.CharField(max_length=200)
    category                = models.CharField(
        max_length=20, choices=Category.choices, default='other', db_index=True
    )

    # Core macros
    calories_per_100g       = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    protein_per_100g        = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    fat_per_100g            = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    carbs_per_100g          = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    fiber_per_100g          = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    # Extended macros
    saturated_fat_per_100g  = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sugar_per_100g          = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    sodium_mg_per_100g      = models.DecimalField(max_digits=7, decimal_places=1, null=True, blank=True)
    cholesterol_mg_per_100g = models.DecimalField(max_digits=7, decimal_places=1, null=True, blank=True)

    # Micronutrients as %DV per 100g
    vitamins_per_100g       = models.JSONField(default=dict, blank=True)
    minerals_per_100g       = models.JSONField(default=dict, blank=True)

    is_verified             = models.BooleanField(default=False, help_text="Pre-seeded verified entry")

    # Serving unit — controls how this food is measured in the UI
    class ServingUnit(models.TextChoices):
        GRAMS = 'g',     'Grams'
        PIECE = 'piece', 'Pieces / Units'

    serving_unit    = models.CharField(
        max_length=10, choices=ServingUnit.choices, default='g',
        help_text="Whether this food is measured in grams or countable pieces.",
    )
    grams_per_piece = models.DecimalField(
        max_digits=6, decimal_places=1, null=True, blank=True,
        help_text="Weight of one piece/unit in grams (e.g. 60 for one egg).",
    )
    serving_label   = models.CharField(
        max_length=50, blank=True,
        help_text="Singular label for one piece, e.g. 'egg', 'banana', 'bar'.",
    )

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return self.name


class MealIngredient(BaseModel):
    """A single ingredient within a MealPlan, with quantity and per-100g macros."""

    meal_plan          = models.ForeignKey(MealPlan, related_name='ingredients', on_delete=models.CASCADE)
    food_item          = models.ForeignKey(
        FoodItem, null=True, blank=True, on_delete=models.SET_NULL,
        help_text="Source food item (optional — per-100g values are snapshotted at save time).",
    )
    name               = models.CharField(max_length=200, help_text="Food name (copied from FoodItem or custom)")

    # Canonical weight — always stored; used for all macro calculations
    quantity_g         = models.DecimalField(max_digits=7, decimal_places=1, default=100)

    # Piece-based tracking (null = grams-only ingredient)
    quantity_pieces    = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True,
                            help_text="Number of pieces/units (null means grams-based).")
    grams_per_piece    = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True,
                            help_text="Snapshotted from FoodItem at creation time.")
    serving_label      = models.CharField(max_length=50, blank=True,
                            help_text="Snapshotted singular label, e.g. 'egg'.")

    # Snapshotted per-100g values — immune to later FoodItem edits
    calories_per_100g  = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    protein_per_100g   = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    fat_per_100g       = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    carbs_per_100g     = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    fiber_per_100g     = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    vitamins_per_100g  = models.JSONField(default=dict, blank=True)
    minerals_per_100g  = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['meal_plan', 'name']

    def __str__(self):
        return f"{self.name} ({self.quantity_g}g) in {self.meal_plan}"
