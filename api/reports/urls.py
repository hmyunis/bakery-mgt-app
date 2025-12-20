from django.urls import path

from .views import DashboardStatsView, ExportReportView

urlpatterns = [
    path("dashboard-stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("export/", ExportReportView.as_view(), name="export-report"),
]
