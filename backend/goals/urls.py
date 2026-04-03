"""URL routing for the Goals domain.

Registers: /api/goals/nodes/
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from goals.views import NodeViewSet

router = DefaultRouter()
router.register("nodes", NodeViewSet, basename="node")

urlpatterns = [
    path("", include(router.urls)),
]
