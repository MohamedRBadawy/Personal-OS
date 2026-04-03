"""URL routing for the Pipeline domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from pipeline.views import ClientViewSet, MarketingActionViewSet, OpportunityViewSet, PipelineWorkspaceAPIView

router = DefaultRouter()
router.register("clients", ClientViewSet, basename="client")
router.register("opportunities", OpportunityViewSet, basename="opportunity")
router.register("marketing", MarketingActionViewSet, basename="marketingaction")

urlpatterns = [
    path("workspace/", PipelineWorkspaceAPIView.as_view(), name="pipeline-workspace"),
    path("", include(router.urls)),
]
