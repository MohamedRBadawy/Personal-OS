"""API views for meal planning, logging, templates, food library, and ingredients."""
from datetime import date as date_type, timedelta

from rest_framework import viewsets, status as drf_status
from rest_framework.decorators import action
from rest_framework.response import Response

from health.models.meal import MealPlan, MealLog, MealTemplate, FoodItem, MealIngredient
from health.serializers.meal import (
    MealPlanSerializer, MealLogSerializer, MealTemplateSerializer,
    FoodItemSerializer, MealIngredientSerializer,
)


# ── Helper ────────────────────────────────────────────────────────────────────

def _recalculate_plan_macros(meal_plan: MealPlan) -> None:
    """Sum ingredient macros and write back to the parent MealPlan fields."""
    ings = meal_plan.ingredients.all()
    if not ings.exists():
        return
    totals = {k: 0.0 for k in ['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g']}
    for ing in ings:
        q = float(ing.quantity_g) / 100
        totals['calories']  += float(ing.calories_per_100g or 0) * q
        totals['protein_g'] += float(ing.protein_per_100g  or 0) * q
        totals['fat_g']     += float(ing.fat_per_100g      or 0) * q
        totals['carbs_g']   += float(ing.carbs_per_100g    or 0) * q
        totals['fiber_g']   += float(ing.fiber_per_100g    or 0) * q
    meal_plan.calories  = round(totals['calories'])
    meal_plan.protein_g = round(totals['protein_g'], 1)
    meal_plan.fat_g     = round(totals['fat_g'], 1)
    meal_plan.carbs_g   = round(totals['carbs_g'], 1)
    meal_plan.fiber_g   = round(totals['fiber_g'], 1)
    meal_plan.save(update_fields=['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g'])


# ── ViewSets ──────────────────────────────────────────────────────────────────

class MealPlanViewSet(viewsets.ModelViewSet):
    """CRUD for daily meal plans. Filter by ?date=YYYY-MM-DD."""
    serializer_class = MealPlanSerializer
    pagination_class = None

    def get_queryset(self):
        qs = MealPlan.objects.select_related('log').prefetch_related('ingredients').all()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(date=date)
        return qs

    @action(detail=False, methods=['get'], url_path='totals')
    def totals(self, request):
        date = request.query_params.get('date')
        if not date:
            return Response({'error': 'date query param required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        plans = MealPlan.objects.filter(date=date)
        total = {'calories': 0, 'protein_g': 0.0, 'fat_g': 0.0, 'carbs_g': 0.0, 'fiber_g': 0.0, 'vitamins': {}, 'minerals': {}}
        for p in plans:
            total['calories']  += p.calories or 0
            total['protein_g'] += float(p.protein_g or 0)
            total['fat_g']     += float(p.fat_g or 0)
            total['carbs_g']   += float(p.carbs_g or 0)
            total['fiber_g']   += float(p.fiber_g or 0)
            for k, v in (p.vitamins or {}).items():
                total['vitamins'][k] = total['vitamins'].get(k, 0) + v
            for k, v in (p.minerals or {}).items():
                total['minerals'][k] = total['minerals'].get(k, 0) + v
        return Response(total)

    @action(detail=False, methods=['post'], url_path='copy-day')
    def copy_day(self, request):
        from_date = request.data.get('from_date')
        to_date   = request.data.get('to_date')
        if not from_date or not to_date:
            return Response({'error': 'from_date and to_date required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        source = MealPlan.objects.filter(date=from_date).prefetch_related('ingredients')
        if not source.exists():
            return Response({'error': 'No plans found for from_date'}, status=drf_status.HTTP_404_NOT_FOUND)
        created = []
        for p in source:
            new_plan = MealPlan.objects.create(
                date=to_date, slot=p.slot, name=p.name,
                calories=p.calories, protein_g=p.protein_g,
                fat_g=p.fat_g, carbs_g=p.carbs_g, fiber_g=p.fiber_g,
                vitamins=p.vitamins, minerals=p.minerals, notes=p.notes,
            )
            # Copy ingredients too
            for ing in p.ingredients.all():
                MealIngredient.objects.create(
                    meal_plan=new_plan,
                    food_item=ing.food_item,
                    name=ing.name,
                    quantity_g=ing.quantity_g,
                    quantity_pieces=ing.quantity_pieces,
                    grams_per_piece=ing.grams_per_piece,
                    serving_label=ing.serving_label,
                    calories_per_100g=ing.calories_per_100g,
                    protein_per_100g=ing.protein_per_100g,
                    fat_per_100g=ing.fat_per_100g,
                    carbs_per_100g=ing.carbs_per_100g,
                    fiber_per_100g=ing.fiber_per_100g,
                    vitamins_per_100g=ing.vitamins_per_100g,
                    minerals_per_100g=ing.minerals_per_100g,
                )
            created.append(new_plan)
        return Response(MealPlanSerializer(created, many=True).data, status=drf_status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='week-summary')
    def week_summary(self, request):
        start = request.query_params.get('start')
        if not start:
            return Response({'error': 'start required'}, status=drf_status.HTTP_400_BAD_REQUEST)
        try:
            start_date = date_type.fromisoformat(start)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=drf_status.HTTP_400_BAD_REQUEST)
        dates = [str(start_date + timedelta(days=i)) for i in range(7)]
        plans = MealPlan.objects.select_related('log').prefetch_related('ingredients').filter(date__in=dates)
        return Response(MealPlanSerializer(plans, many=True).data)


class MealLogViewSet(viewsets.ModelViewSet):
    serializer_class = MealLogSerializer
    pagination_class = None

    def get_queryset(self):
        qs = MealLog.objects.all()
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(date=date)
        return qs


class MealTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = MealTemplateSerializer
    pagination_class = None
    queryset = MealTemplate.objects.all()


class FoodItemViewSet(viewsets.ModelViewSet):
    """Personal food library — CRUD. Supports ?search= and ?category= query params."""
    serializer_class = FoodItemSerializer
    pagination_class = None

    def get_queryset(self):
        qs = FoodItem.objects.all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search)
        category = self.request.query_params.get('category', '').strip()
        if category:
            qs = qs.filter(category=category)
        return qs


class MealIngredientViewSet(viewsets.ModelViewSet):
    """Ingredients within a MealPlan. Filter by ?meal_plan=<uuid>."""
    serializer_class = MealIngredientSerializer
    pagination_class = None

    def get_queryset(self):
        qs = MealIngredient.objects.select_related('food_item', 'meal_plan').all()
        meal_plan_id = self.request.query_params.get('meal_plan')
        if meal_plan_id:
            qs = qs.filter(meal_plan_id=meal_plan_id)
        return qs

    def perform_create(self, serializer):
        food_item = serializer.validated_data.get('food_item')
        extra = {}
        if food_item:
            # Snapshot per-100g macro values
            for field in ['calories_per_100g', 'protein_per_100g', 'fat_per_100g', 'carbs_per_100g', 'fiber_per_100g']:
                if field not in serializer.validated_data or serializer.validated_data[field] is None:
                    extra[field] = getattr(food_item, field)
            for field in ['vitamins_per_100g', 'minerals_per_100g']:
                if not serializer.validated_data.get(field):
                    extra[field] = getattr(food_item, field, {}) or {}
            if not serializer.validated_data.get('name'):
                extra['name'] = food_item.name
            # Snapshot serving info for piece-based foods
            if food_item.serving_unit == 'piece' and food_item.grams_per_piece:
                if not serializer.validated_data.get('grams_per_piece'):
                    extra['grams_per_piece'] = food_item.grams_per_piece
                if not serializer.validated_data.get('serving_label'):
                    extra['serving_label'] = food_item.serving_label or food_item.name.lower()

        # Compute quantity_g from pieces × grams_per_piece when piece-based
        qty_pieces = serializer.validated_data.get('quantity_pieces')
        grams_per = extra.get('grams_per_piece') or serializer.validated_data.get('grams_per_piece')
        if qty_pieces is not None and grams_per:
            extra['quantity_g'] = round(float(qty_pieces) * float(grams_per), 1)

        instance = serializer.save(**extra)
        _recalculate_plan_macros(instance.meal_plan)

    def perform_update(self, serializer):
        instance = serializer.save()
        # Recompute quantity_g from pieces when piece-based and only pieces was sent
        if instance.quantity_pieces is not None and instance.grams_per_piece:
            computed_g = round(float(instance.quantity_pieces) * float(instance.grams_per_piece), 1)
            if abs(float(instance.quantity_g) - computed_g) > 0.05:
                instance.quantity_g = computed_g
                instance.save(update_fields=['quantity_g'])
        _recalculate_plan_macros(instance.meal_plan)

    def perform_destroy(self, instance):
        meal_plan = instance.meal_plan
        instance.delete()
        _recalculate_plan_macros(meal_plan)
