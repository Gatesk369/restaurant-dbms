from django.urls import path

from payments import report_views
from payments.views import PayOrderView

urlpatterns = [
    path("staff/orders/<int:order_id>/pay/", PayOrderView.as_view()),
    path("staff/reports/daily-sales/", report_views.DailySalesView.as_view()),
    path("staff/reports/top-items/", report_views.TopItemsView.as_view()),
    path(
        "staff/reports/waiter-performance/",
        report_views.WaiterPerformanceView.as_view(),
    ),
    path("staff/reports/table-turnover/", report_views.TableTurnoverView.as_view()),
    path("staff/reports/payment-methods/", report_views.PaymentMethodsView.as_view()),
]
