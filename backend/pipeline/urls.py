"""URL routing for the Pipeline domain.

Registers:
  /api/pipeline/clients/                    — Client CRUD
  /api/pipeline/opportunities/              — Opportunity CRUD
  /api/pipeline/marketing/                  — MarketingAction CRUD
  /api/pipeline/channels/                   — MarketingChannel CRUD
  /api/pipeline/campaigns/                  — MarketingCampaign CRUD
  /api/pipeline/workspace/                  — Composite pipeline workspace
  /api/pipeline/marketing-workspace/        — Composite marketing workspace
  /api/pipeline/webhook/opportunities/      — n8n scraper ingest endpoint
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from pipeline.views import (
    ClientViewSet,
    MarketingActionViewSet,
    MarketingCampaignViewSet,
    MarketingChannelViewSet,
    MarketingWorkspaceAPIView,
    OpportunityViewSet,
    PipelineWorkspaceAPIView,
    WorkOverviewAPIView,
)
from pipeline.webhook import OpportunityWebhookView

router = DefaultRouter()
router.register("clients", ClientViewSet, basename="client")
router.register("opportunities", OpportunityViewSet, basename="opportunity")
router.register("marketing", MarketingActionViewSet, basename="marketingaction")
router.register("channels", MarketingChannelViewSet, basename="marketingchannel")
router.register("campaigns", MarketingCampaignViewSet, basename="marketingcampaign")

urlpatterns = [
    path("workspace/", PipelineWorkspaceAPIView.as_view(), name="pipeline-workspace"),
    path("marketing-workspace/", MarketingWorkspaceAPIView.as_view(), name="marketing-workspace"),
    path("webhook/opportunities/", OpportunityWebhookView.as_view(), name="opportunity-webhook"),
    path("", include(router.urls)),
]
