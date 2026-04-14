"""Serializers for MealPlan, MealLog, MealTemplate, FoodItem, MealIngredient."""
from rest_framework import serializers
from health.models.meal import MealPlan, MealLog, MealTemplate, FoodItem, MealIngredient


class MealLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealLog
        fields = ['id', 'plan', 'date', 'slot', 'status', 'notes']
        read_only_fields = ['id']


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = [
            'id', 'name', 'category',
            'calories_per_100g', 'protein_per_100g', 'fat_per_100g',
            'carbs_per_100g', 'fiber_per_100g',
            'saturated_fat_per_100g', 'sugar_per_100g',
            'sodium_mg_per_100g', 'cholesterol_mg_per_100g',
            'vitamins_per_100g', 'minerals_per_100g',
            'is_verified',
            'serving_unit', 'grams_per_piece', 'serving_label',
        ]
        read_only_fields = ['id']


class MealIngredientSerializer(serializers.ModelSerializer):
    # Computed totals for this ingredient at its current quantity
    calories  = serializers.SerializerMethodField()
    protein_g = serializers.SerializerMethodField()
    fat_g     = serializers.SerializerMethodField()
    carbs_g   = serializers.SerializerMethodField()
    fiber_g   = serializers.SerializerMethodField()

    class Meta:
        model = MealIngredient
        fields = [
            'id', 'meal_plan', 'food_item', 'name',
            'quantity_g', 'quantity_pieces', 'grams_per_piece', 'serving_label',
            'calories_per_100g', 'protein_per_100g', 'fat_per_100g',
            'carbs_per_100g', 'fiber_per_100g',
            'vitamins_per_100g', 'minerals_per_100g',
            # computed:
            'calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g',
        ]
        read_only_fields = ['id', 'calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g']

    def _compute(self, obj, per_100g_field):
        val = getattr(obj, per_100g_field) or 0
        return round(float(val) * float(obj.quantity_g) / 100, 1)

    def get_calories(self, obj):  return round(float(obj.calories_per_100g or 0) * float(obj.quantity_g) / 100)
    def get_protein_g(self, obj): return self._compute(obj, 'protein_per_100g')
    def get_fat_g(self, obj):     return self._compute(obj, 'fat_per_100g')
    def get_carbs_g(self, obj):   return self._compute(obj, 'carbs_per_100g')
    def get_fiber_g(self, obj):   return self._compute(obj, 'fiber_per_100g')


class MealPlanSerializer(serializers.ModelSerializer):
    log         = MealLogSerializer(read_only=True)
    ingredients = MealIngredientSerializer(many=True, read_only=True)

    class Meta:
        model = MealPlan
        fields = [
            'id', 'date', 'slot', 'name',
            'calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g',
            'vitamins', 'minerals', 'notes',
            'log', 'ingredients',
        ]
        read_only_fields = ['id']


class MealTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealTemplate
        fields = [
            'id', 'slot', 'name',
            'calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g',
            'vitamins', 'minerals', 'notes',
        ]
        read_only_fields = ['id']
