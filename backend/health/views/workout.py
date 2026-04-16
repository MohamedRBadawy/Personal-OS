"""Views for workout session, exercise, and set tracking."""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from health.models.workout import SetLog, WorkoutExercise, WorkoutSession
from health.serializers.workout import SetLogSerializer, WorkoutExerciseSerializer, WorkoutSessionSerializer


class WorkoutSessionViewSet(viewsets.ModelViewSet):
    """CRUD for workout sessions. Filter by ?date= or ?date_from= / ?date_to=."""

    serializer_class = WorkoutSessionSerializer
    pagination_class = None

    def get_queryset(self):
        qs = WorkoutSession.objects.prefetch_related('exercises__sets').all()
        params = self.request.query_params

        date = params.get('date')
        if date:
            qs = qs.filter(date=date)

        date_from = params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    @action(detail=False, methods=['get'], url_path='strength-history')
    def strength_history(self, request):
        """GET /health/workout-sessions/strength-history/?exercise_name=...&weeks=8"""
        from health.analytics import ExerciseAnalyticsService

        name = request.query_params.get('exercise_name', '').strip()
        if not name:
            return Response({'error': 'exercise_name query param is required.'}, status=400)
        weeks = int(request.query_params.get('weeks', 8))
        return Response(ExerciseAnalyticsService.strength_history(name, weeks))


class WorkoutExerciseViewSet(viewsets.ModelViewSet):
    """CRUD for exercises within a session. Filter by ?session=<uuid>."""

    serializer_class = WorkoutExerciseSerializer
    pagination_class = None

    def get_queryset(self):
        qs = WorkoutExercise.objects.prefetch_related('sets').all()
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(session_id=session_id)
        return qs


class SetLogViewSet(viewsets.ModelViewSet):
    """CRUD for individual sets. Filter by ?exercise=<uuid>."""

    serializer_class = SetLogSerializer
    pagination_class = None

    def get_queryset(self):
        qs = SetLog.objects.all()
        exercise_id = self.request.query_params.get('exercise')
        if exercise_id:
            qs = qs.filter(exercise_id=exercise_id)
        return qs
