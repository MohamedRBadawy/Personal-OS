"""URL routing for the Contacts domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from contacts.views import ContactViewSet, DueFollowupsView

router = DefaultRouter()
router.register("contacts", ContactViewSet, basename="contact")

urlpatterns = [
    path("due-followups/", DueFollowupsView.as_view(), name="contacts-due-followups"),
    path("", include(router.urls)),
]
