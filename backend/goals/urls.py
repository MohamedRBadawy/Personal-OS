"""URL routing for the Goals domain.

Registers: /api/goals/nodes/
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from goals.views import GoalAttachmentProfileViewSet, NodeViewSet

router = DefaultRouter()
router.register("nodes", NodeViewSet, basename="node")
router.register("attachments", GoalAttachmentProfileViewSet, basename="goalattachmentprofile")

urlpatterns = [
    path("", include(router.urls)),
]
