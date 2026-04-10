"""Pipeline CRUD plus summary and workspace read models."""
from datetime import date, timedelta

from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline.models import Client, MarketingAction, MarketingCampaign, MarketingChannel, Opportunity
from pipeline.serializers import (
    ClientSerializer,
    MarketingActionSerializer,
    MarketingCampaignSerializer,
    MarketingChannelSerializer,
    OpportunitySerializer,
)
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


class MarketingChannelViewSet(viewsets.ModelViewSet):
    """CRUD API for marketing presence channels."""

    queryset = MarketingChannel.objects.all()
    serializer_class = MarketingChannelSerializer


class MarketingCampaignViewSet(viewsets.ModelViewSet):
    """CRUD API for structured marketing campaigns."""

    queryset = MarketingCampaign.objects.all()
    serializer_class = MarketingCampaignSerializer


class MarketingActionViewSet(viewsets.ModelViewSet):
    """CRUD API for outreach and visibility actions."""

    serializer_class = MarketingActionSerializer

    def get_queryset(self):
        qs = MarketingAction.objects.all()
        goal_id = self.request.query_params.get("goal")
        if goal_id:
            qs = qs.filter(goal_id=goal_id)
        campaign_id = self.request.query_params.get("campaign")
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)
        channel_id = self.request.query_params.get("channel")
        if channel_id:
            qs = qs.filter(channel_id=channel_id)
        action_type = self.request.query_params.get("action_type")
        if action_type:
            qs = qs.filter(action_type=action_type)
        return qs

    def perform_create(self, serializer):
        action = serializer.save()
        # Auto-update last_action_date on the linked channel
        if action.channel_id:
            MarketingChannel.objects.filter(pk=action.channel_id).update(
                last_action_date=action.date,
            )


class MarketingWorkspaceAPIView(APIView):
    """Composite read model for the Marketing Hub page."""

    def get(self, request):
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        all_actions = MarketingAction.objects.all()

        this_week_count = all_actions.filter(date__gte=week_start).count()
        this_month_count = all_actions.filter(date__gte=month_start).count()

        # Actions by type breakdown
        type_qs = (
            all_actions
            .exclude(action_type="")
            .values("action_type")
            .annotate(count=Count("id"))
        )
        actions_by_type = {row["action_type"]: row["count"] for row in type_qs}

        # Active campaigns with action counts and channel details
        active_campaigns = MarketingCampaign.objects.filter(
            status__in=[MarketingCampaign.Status.ACTIVE, MarketingCampaign.Status.PLANNED],
        ).prefetch_related("channels")
        active_campaigns_data = []
        for campaign in active_campaigns:
            action_count = all_actions.filter(campaign=campaign).count()
            channels_data = MarketingChannelSerializer(campaign.channels.all(), many=True).data
            campaign_data = MarketingCampaignSerializer(campaign).data
            campaign_data["action_count"] = action_count
            campaign_data["channels"] = channels_data
            active_campaigns_data.append(campaign_data)

        # Channel summary with total action counts
        channels = MarketingChannel.objects.all()
        channel_summary = []
        for ch in channels:
            total_actions = all_actions.filter(channel=ch).count()
            ch_data = MarketingChannelSerializer(ch).data
            ch_data["total_actions"] = total_actions
            channel_summary.append(ch_data)

        # Recent actions (last 10)
        recent_actions = all_actions.select_related("campaign", "channel", "contact")[:10]
        recent_actions_data = MarketingActionSerializer(recent_actions, many=True).data

        # Due follow-ups
        due_follow_ups = all_actions.filter(
            follow_up_done=False,
            follow_up_date__isnull=False,
            follow_up_date__lte=today,
        ).order_by("follow_up_date")
        due_follow_ups_data = MarketingActionSerializer(due_follow_ups, many=True).data

        return Response(
            {
                "this_week_count": this_week_count,
                "this_month_count": this_month_count,
                "active_campaign_count": MarketingCampaign.objects.filter(status=MarketingCampaign.Status.ACTIVE).count(),
                "active_channel_count": MarketingChannel.objects.filter(status=MarketingChannel.Status.ACTIVE).count(),
                "actions_by_type": actions_by_type,
                "active_campaigns": active_campaigns_data,
                "channel_summary": channel_summary,
                "recent_actions": recent_actions_data,
                "due_follow_ups": due_follow_ups_data,
            },
            status=status.HTTP_200_OK,
        )


class PipelineWorkspaceAPIView(APIView):
    """Expose the composite pipeline workspace payload."""

    def get(self, request):
        return Response(PipelineWorkspaceService.payload(), status=status.HTTP_200_OK)


class WorkOverviewAPIView(APIView):
    """Expose the grouped work and career workspace payload."""

    def get(self, request):
        return Response(WorkOverviewService.payload(), status=status.HTTP_200_OK)
