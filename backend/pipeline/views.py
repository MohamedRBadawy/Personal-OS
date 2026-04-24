"""Pipeline CRUD plus summary and workspace read models."""
from datetime import date, timedelta

from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from pipeline.models import (
    Client, EquityPartnership, MarketingAction, MarketingCampaign,
    MarketingChannel, Opportunity, OutreachStep, PartnershipAction,
)
from pipeline.serializers import (
    ClientSerializer,
    EquityPartnershipSerializer,
    MarketingActionSerializer,
    MarketingCampaignSerializer,
    MarketingChannelSerializer,
    OpportunitySerializer,
    OutreachStepSerializer,
    PartnershipActionSerializer,
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

    @action(detail=True, methods=["post"])
    def draft_message(self, request, pk=None):
        """Ask AI to draft an outreach message for this opportunity.

        Body: { "channel": "linkedin" | "email" | "upwork" }
        """
        opp = self.get_object()
        channel = request.data.get("channel", "linkedin")
        force_refresh = request.data.get("refresh", False)

        # Return cached draft if available and not forcing refresh
        if opp.ai_draft and not force_refresh:
            return Response({"draft": opp.ai_draft, "cached": True})

        try:
            import os  # noqa: PLC0415
            from profile.models import UserProfile  # noqa: PLC0415

            profile = UserProfile.get_or_create_singleton()
            profile_context = (
                f"Name: {profile.full_name or 'Mohamed Badawy'}. "
                f"Service: Operations Clarity Audit — operational systems consulting. "
                f"Background: Operational systems expert. Built K Line Europe reporting system (reduced report time from 128h to minutes). Reduced external defect rate from 1.68% to 0.99%."
            )

            prompt = (
                f"Write a concise, personalized outreach message for the following opportunity:\n\n"
                f"Opportunity: {opp.name}\n"
                f"Platform: {opp.platform}\n"
                f"Channel: {channel}\n"
                f"Description: {opp.description or 'Not provided'}\n"
                f"Client: {opp.client_name or 'Unknown'}\n"
                f"Prospect context: {opp.prospect_context or 'Not provided'}\n\n"
                f"Sender profile: {profile_context}\n\n"
                f"Requirements:\n"
                f"- Tone: professional, direct, not salesy\n"
                f"- Length: 3-5 sentences max for {channel}\n"
                f"- Focus on the specific problem they might have\n"
                f"- End with a soft CTA (e.g. 'Happy to send you a brief overview')\n"
                f"- No generic templates — make it feel personal and specific\n\n"
                f"Return ONLY the message text, nothing else."
            )

            api_key = os.getenv("ANTHROPIC_API_KEY", "")
            if not api_key:
                # Fallback: return a template
                draft = (
                    f"Hi {opp.client_name or 'there'},\n\n"
                    f"I noticed {opp.name} and believe I can help with operational efficiency.\n\n"
                    f"I recently helped a clear aligner manufacturer reduce reporting time from 128 hours to minutes.\n\n"
                    f"Happy to send you a brief overview of how this could apply to your situation.\n\nBest,\nMohamed"
                )
            else:
                from anthropic import Anthropic  # noqa: PLC0415
                client = Anthropic(api_key=api_key)
                response = client.messages.create(
                    model="claude-3-5-haiku-latest",
                    max_tokens=400,
                    system="You write concise, professional outreach messages for a business consultant.",
                    messages=[{"role": "user", "content": prompt}],
                )
                draft = response.content[0].text.strip()

            # Cache the draft
            opp.ai_draft = draft
            opp.save(update_fields=["ai_draft"])

        except Exception as exc:  # noqa: BLE001
            return Response({"detail": f"AI drafting failed: {exc}"}, status=502)

        return Response({"draft": draft, "cached": False})

    @action(detail=True, methods=["post"])
    def mark_outreach_sent(self, request, pk=None):
        """Mark that an outreach message was sent and optionally set a follow-up date."""
        from django.utils import timezone  # noqa: PLC0415
        import datetime  # noqa: PLC0415

        opp = self.get_object()
        opp.last_outreach_at = timezone.now()
        opp.outreach_count = (opp.outreach_count or 0) + 1

        days = int(request.data.get("followup_days", 7))
        opp.next_followup_date = timezone.localdate() + datetime.timedelta(days=days)

        # Clear cached draft so next send gets a fresh follow-up draft
        opp.ai_draft = ""
        opp.save(update_fields=["last_outreach_at", "outreach_count", "next_followup_date", "ai_draft"])

        return Response({
            "outreach_count": opp.outreach_count,
            "last_outreach_at": opp.last_outreach_at,
            "next_followup_date": opp.next_followup_date,
        })

    # [AR] حفظ المسودة المولَّدة بالذكاء الاصطناعي كخطوة تواصل تلقائياً
    # [EN] Save an AI-generated draft as an outreach step automatically
    @action(detail=True, methods=["post"], url_path="steps/from-draft")
    def steps_from_draft(self, request, pk=None):
        opp = self.get_object()
        channel = request.data.get("channel", "linkedin")
        draft_text = request.data.get("draft_text", "")

        # If no pre-generated draft text supplied, generate one via existing logic
        if not draft_text:
            from django.test import RequestFactory  # noqa: PLC0415
            import json  # noqa: PLC0415
            fake_request = RequestFactory().post("/", data=json.dumps({"channel": channel}), content_type="application/json")
            fake_request.user = request.user
            response = self.draft_message(fake_request, pk=pk)
            if response.status_code != 200:
                return response
            draft_text = response.data.get("draft", "")

        step = OutreachStep.objects.create(
            opportunity=opp,
            user=request.user if request.user.is_authenticated else None,
            step_type=OutreachStep.StepType.FIRST_MESSAGE,
            draft_message=draft_text,
        )
        return Response(
            {"step": OutreachStepSerializer(step).data, "draft_message": draft_text},
            status=status.HTTP_201_CREATED,
        )

    # [AR] قائمة خطوات التواصل وإنشاؤها لكل فرصة
    # [EN] List and create outreach steps per opportunity
    @action(detail=True, methods=["get", "post"], url_path="steps")
    def steps(self, request, pk=None):
        opp = self.get_object()
        if request.method == "GET":
            qs = OutreachStep.objects.filter(opportunity=opp).order_by("-date", "-created_at")
            return Response(OutreachStepSerializer(qs, many=True).data)
        serializer = OutreachStepSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(opportunity=opp, user=request.user if request.user.is_authenticated else None)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def due_followups(self, request):
        """Opportunities where next_followup_date <= today."""
        from django.utils import timezone  # noqa: PLC0415

        today = timezone.localdate()
        overdue = self.queryset.filter(
            next_followup_date__lte=today,
            status__in=["new", "reviewing", "applied", "interview", "proposal_sent"],
        ).order_by("next_followup_date")
        return Response(OpportunitySerializer(overdue, many=True).data)


# [AR] واجهات برمجة الشراكات الرأسمالية — إنشاء وتحديث وإدارة الإجراءات
# [EN] Equity partnership API views — create, update, and manage actions
class EquityPartnershipViewSet(viewsets.ModelViewSet):
    """CRUD API for equity partnerships."""

    serializer_class = EquityPartnershipSerializer

    def get_queryset(self):
        return EquityPartnership.objects.prefetch_related("actions").all()

    @action(detail=True, methods=["get", "post"], url_path="actions")
    def actions_list(self, request, pk=None):
        partnership = self.get_object()
        if request.method == "GET":
            qs = partnership.actions.all()
            return Response(PartnershipActionSerializer(qs, many=True).data)
        serializer = PartnershipActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            partnership=partnership,
            user=request.user if request.user.is_authenticated else None,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path=r"actions/(?P<action_pk>[^/.]+)/complete")
    def complete_action(self, request, pk=None, action_pk=None):
        from django.utils import timezone as tz  # noqa: PLC0415

        action_obj = PartnershipAction.objects.get(pk=action_pk, partnership_id=pk)
        action_obj.completed_at = tz.now()
        action_obj.is_current_next_action = False
        action_obj.save(update_fields=["completed_at", "is_current_next_action"])
        return Response(PartnershipActionSerializer(action_obj).data)


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
