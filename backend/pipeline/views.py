"""Pipeline CRUD plus summary and workspace read models."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline.models import Client, MarketingAction, Opportunity
from pipeline.serializers import ClientSerializer, MarketingActionSerializer, OpportunitySerializer
from pipeline.services import OpportunityLifecycleService, PipelineWorkspaceService, WorkOverviewService


class ClientViewSet(viewsets.ModelViewSet):
    """CRUD API for downstream clients."""

    queryset = Client.objects.all()
    serializer_class = ClientSerializer


class OpportunityViewSet(viewsets.ModelViewSet):
    """CRUD API for opportunities with lifecycle automation."""

    queryset = Opportunity.objects.all()
    serializer_class = OpportunitySerializer

    def perform_create(self, serializer):
        opportunity = serializer.save()
        OpportunityLifecycleService.enrich(opportunity)
        OpportunityLifecycleService.handle_status_change(opportunity)

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        opportunity = serializer.save()
        OpportunityLifecycleService.enrich(opportunity)
        OpportunityLifecycleService.handle_status_change(opportunity, previous_status)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        return Response(OpportunityLifecycleService.summary())


class MarketingActionViewSet(viewsets.ModelViewSet):
    """CRUD API for outreach and visibility actions."""

    queryset = MarketingAction.objects.all()
    serializer_class = MarketingActionSerializer


class PipelineWorkspaceAPIView(APIView):
    """Expose the composite pipeline workspace payload."""

    def get(self, request):
        return Response(PipelineWorkspaceService.payload(), status=status.HTTP_200_OK)


class WorkOverviewAPIView(APIView):
    """Expose the grouped work and career workspace payload."""

    def get(self, request):
        return Response(WorkOverviewService.payload(), status=status.HTTP_200_OK)
