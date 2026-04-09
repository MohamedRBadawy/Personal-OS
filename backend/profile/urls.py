from django.urls import path

from .views import AIContextView, ProfileView

urlpatterns = [
    path("", ProfileView.as_view(), name="profile"),
    path("ai-context/", AIContextView.as_view(), name="profile-ai-context"),
]
