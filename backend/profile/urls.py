# [AR] مسارات URL للملف الشخصي — الملف الشخصي والنجمة الشمالية
# [EN] Profile URL routes — profile, AI context, and north star endpoints
from django.urls import path

from .views import AIContextView, NorthStarView, ProfileView

urlpatterns = [
    path("", ProfileView.as_view(), name="profile"),
    path("ai-context/", AIContextView.as_view(), name="profile-ai-context"),
    path("north-star/", NorthStarView.as_view(), name="profile-north-star"),
]
