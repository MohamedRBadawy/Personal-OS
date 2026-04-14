"""URL routing for the Contacts domain."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from contacts.views import ContactGmailView, ContactInteractionViewSet, ContactViewSet, DueFollowupsView

router = DefaultRouter()
router.register("contacts", ContactViewSet, basename="contact")
router.register("interactions", ContactInteractionViewSet, basename="contact-interaction")

urlpatterns = [
    path("due-followups/", DueFollowupsView.as_view(), name="contacts-due-followups"),
    path("contacts/<int:pk>/gmail-threads/", ContactGmailView.as_view(), name="contact-gmail-threads"),
    path("", include(router.urls)),
]
