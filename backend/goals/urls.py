"""URL routing for the Goals domain.

Registers:
  /api/goals/nodes/            — Node CRUD + tree/map/context
  /api/goals/attachments/      — GoalAttachmentProfile (structured support layers)
  /api/goals/node-attachments/ — Attachment (URLs, files, snippets per node)
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from goals.views import AttachmentViewSet, GoalAttachmentProfileViewSet, LearningItemViewSet, NodeViewSet, TimeLogViewSet

router = DefaultRouter()
router.register("nodes", NodeViewSet, basename="node")
router.register("attachments", GoalAttachmentProfileViewSet, basename="goalattachmentprofile")
router.register("node-attachments", AttachmentViewSet, basename="nodeattachment")
router.register("learning", LearningItemViewSet, basename="learning")
router.register("timelogs", TimeLogViewSet, basename="timelog")

urlpatterns = [
    path("", include(router.urls)),
]
