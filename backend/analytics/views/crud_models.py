# [AR] واجهات CRUD لسجلات التحليلات — الأفكار والإنجازات والسجلات المختلفة
# [EN] CRUD analytics views — ideas, achievements, and supporting domain records
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from analytics.models.achievement import Achievement
from analytics.models.decision_log import DecisionLog
from analytics.models.family_goal import FamilyGoal
from analytics.models.idea import Idea
from analytics.models.learning import Learning
from analytics.models.project_retrospective import ProjectRetrospective
from analytics.models.relationship import Relationship
from analytics.serializers.crud_models import (
    AchievementSerializer,
    DecisionLogSerializer,
    FamilyGoalSerializer,
    IdeaSerializer,
    LearningSerializer,
    ProjectRetrospectiveSerializer,
    RelationshipSerializer,
)
from analytics.services import suggest_domain
from analytics.services.decisions import DecisionService


class RelationshipViewSet(viewsets.ModelViewSet):
    """CRUD API for relationship records."""

    queryset = Relationship.objects.all()
    serializer_class = RelationshipSerializer


class FamilyGoalViewSet(viewsets.ModelViewSet):
    """CRUD API for family-goal records."""

    queryset = FamilyGoal.objects.all()
    serializer_class = FamilyGoalSerializer


class LearningViewSet(viewsets.ModelViewSet):
    """CRUD API for learning records."""

    queryset = Learning.objects.all()
    serializer_class = LearningSerializer


class DecisionLogViewSet(viewsets.ModelViewSet):
    """CRUD API for decision-log records."""

    queryset = DecisionLog.objects.all()
    serializer_class = DecisionLogSerializer

    @action(detail=False, methods=["get"], url_path="due")
    def due(self, request):
        decisions = DecisionService.due_for_review(timezone.localdate())
        serializer = self.get_serializer(decisions, many=True)
        return Response(serializer.data)


class AchievementViewSet(viewsets.ModelViewSet):
    """CRUD API for achievement records."""

    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer


class IdeaViewSet(viewsets.ModelViewSet):
    # [AR] واجهة الأفكار — يقبل العناوين الفارغة ويقترح النطاق تلقائياً
    # [EN] Idea viewset — accepts empty titles and auto-suggests domain
    queryset = Idea.objects.all()
    serializer_class = IdeaSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        title = data.get('title', '') or ''
        domain_hint = data.get('domain_hint') or None

        suggestion = suggest_domain(title)
        if not domain_hint and suggestion['suggested_domain']:
            domain_hint = suggestion['suggested_domain']
            data['domain_hint'] = domain_hint

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        response_data = serializer.data
        response_data['suggested_domain'] = suggestion['suggested_domain']
        response_data['domain_confidence'] = suggestion['confidence']
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def convert_to_node(self, request, pk=None):
        """Convert an idea into a Node and link it back to this idea.

        Body: { type: str, parent: str|null }
        Returns: { node_id: str, node_title: str }
        """
        from goals.models import Node  # noqa: PLC0415

        idea = self.get_object()
        node_type = request.data.get("type", "task")
        parent_id = request.data.get("parent") or None

        valid_types = [c[0] for c in Node.Type.choices]
        if node_type not in valid_types:
            return Response(
                {"detail": f"Invalid type '{node_type}'. Valid: {valid_types}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        node = Node.objects.create(
            title=idea.title,
            notes=idea.context or "",
            type=node_type,
            status="available",
            parent_id=parent_id,
        )

        idea.linked_goal = node
        idea.status = "validated"
        idea.save(update_fields=["linked_goal", "status"])

        return Response({"node_id": str(node.id), "node_title": node.title}, status=status.HTTP_201_CREATED)


class ProjectRetrospectiveViewSet(viewsets.ModelViewSet):
    """CRUD API for retrospective records."""

    queryset = ProjectRetrospective.objects.all()
    serializer_class = ProjectRetrospectiveSerializer


class SuggestDomainView(APIView):
    # [AR] اقتراح نطاق الفكرة — يعيد النطاق المقترح بناءً على العنوان
    # [EN] Suggest domain endpoint — returns suggested hub domain from title keywords
    def get(self, request):
        title = request.query_params.get('title', '')
        return Response(suggest_domain(title))
