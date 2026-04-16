"""Health AI intelligence views — readiness score and week analysis."""
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthReadinessAPIView(APIView):
    """GET /health/readiness/ — composite recovery + readiness score for today."""

    def get(self, request):
        from health.analytics import ExerciseAnalyticsService
        return Response(ExerciseAnalyticsService.readiness_today())


class HealthAIInsightsAPIView(APIView):
    """POST /health/ai-insights/ — Claude-powered week health analysis."""

    def post(self, request):
        from health.analytics import ExerciseAnalyticsService
        from core.ai import get_ai_provider

        try:
            context = ExerciseAnalyticsService.build_ai_context()
            provider = get_ai_provider()
            result = provider.analyze_health_week(context=context)
        except Exception as exc:
            return Response({'error': str(exc)}, status=500)

        return Response(result)
