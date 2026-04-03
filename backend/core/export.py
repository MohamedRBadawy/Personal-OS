"""Full JSON export service and endpoint for Personal Life OS.

Produces a single JSON file containing all 15 domain tables as defined
in the Logic Spec §15. Used for backup, external analysis, and migration.

Export shape:
{
  "exported_at": "ISO datetime",
  "version": "1.0",
  "profile": {...},
  "nodes": [...],
  "finance": [...],
  "health": [...],
  ... (all domains)
}
"""
import datetime

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models import (
    Achievement, AISuggestion, DecisionLog, FamilyGoal,
    Idea, Learning, Relationship, WeeklyReview,
)
from analytics.serializers.crud_models import (
    AchievementSerializer, DecisionLogSerializer, FamilyGoalSerializer,
    IdeaSerializer, LearningSerializer, RelationshipSerializer,
)
from analytics.serializers.ai_suggestion import AISuggestionSerializer
from analytics.serializers.weekly_review import WeeklyReviewSerializer
from core.models import DailyCheckIn, Profile
from core.serializers import DailyCheckInSerializer, ProfileSerializer
from finance.models import FinanceEntry
from finance.serializers import FinanceEntrySerializer
from goals.models import Node
from goals.serializers import NodeSerializer
from health.models import HealthLog, Habit, HabitLog, MoodLog, SpiritualLog
from health.serializers import (
    HealthLogSerializer, HabitSerializer, HabitLogSerializer,
    MoodLogSerializer, SpiritualLogSerializer,
)
from pipeline.models import Client, MarketingAction, Opportunity
from pipeline.serializers import ClientSerializer, MarketingActionSerializer, OpportunitySerializer
from schedule.models import ScheduleTemplate, ScheduleLog
from schedule.serializers import ScheduleTemplateSerializer, ScheduleLogSerializer


class FullExportView(APIView):
    """GET /api/core/export/ — Returns all domain data as a single JSON payload.

    Intended for: backup, migration, external analysis (e.g. Google Sheets),
    and the personal review report described in PRD §9.
    """

    def get(self, request):
        """Build and return the full export payload."""
        profile = Profile.objects.first()
        payload = {
            "exported_at": timezone.now().isoformat(),
            "version": "1.0",
            "profile": ProfileSerializer(profile).data if profile else None,
            "nodes": NodeSerializer(Node.objects.all(), many=True).data,
            "finance": FinanceEntrySerializer(FinanceEntry.objects.all(), many=True).data,
            "health": HealthLogSerializer(HealthLog.objects.all(), many=True).data,
            "habits": HabitSerializer(Habit.objects.all(), many=True).data,
            "habit_logs": HabitLogSerializer(HabitLog.objects.all(), many=True).data,
            "mood": MoodLogSerializer(MoodLog.objects.all(), many=True).data,
            "spiritual": SpiritualLogSerializer(SpiritualLog.objects.all(), many=True).data,
            "schedule_templates": ScheduleTemplateSerializer(
                ScheduleTemplate.objects.all(), many=True,
            ).data,
            "schedule_logs": ScheduleLogSerializer(ScheduleLog.objects.all(), many=True).data,
            "opportunities": OpportunitySerializer(Opportunity.objects.all(), many=True).data,
            "clients": ClientSerializer(Client.objects.all(), many=True).data,
            "marketing": MarketingActionSerializer(MarketingAction.objects.all(), many=True).data,
            "decisions": DecisionLogSerializer(DecisionLog.objects.all(), many=True).data,
            "learning": LearningSerializer(Learning.objects.all(), many=True).data,
            "achievements": AchievementSerializer(Achievement.objects.all(), many=True).data,
            "ideas": IdeaSerializer(Idea.objects.all(), many=True).data,
            "relations": RelationshipSerializer(Relationship.objects.all(), many=True).data,
            "family": FamilyGoalSerializer(FamilyGoal.objects.all(), many=True).data,
            "weekly_reviews": WeeklyReviewSerializer(WeeklyReview.objects.all(), many=True).data,
            "ai_suggestions": AISuggestionSerializer(AISuggestion.objects.all(), many=True).data,
            "checkins": DailyCheckInSerializer(DailyCheckIn.objects.all(), many=True).data,
        }
        return Response(payload)
