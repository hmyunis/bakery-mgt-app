from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    NotificationLogViewSet,
    NotificationPreferenceViewSet,
    PushSubscriptionViewSet,
)

router = DefaultRouter()
router.register(r"subscriptions", PushSubscriptionViewSet, basename="push-subscription")
router.register(
    r"preferences", NotificationPreferenceViewSet, basename="notification-preference"
)
router.register(r"logs", NotificationLogViewSet, basename="notification-log")

urlpatterns = [
    path("", include(router.urls)),
]
