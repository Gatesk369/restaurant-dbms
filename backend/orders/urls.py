from django.urls import path

from orders import staff_views, views

urlpatterns = [
    path("my/orders/", views.MyOrdersView.as_view()),
    path("my/orders/<int:order_id>/", views.MyOrderDetailView.as_view()),
    path("my/orders/<int:order_id>/cancel/", views.MyOrderCancelView.as_view()),
    path("staff/orders/", staff_views.StaffOrderQueueView.as_view()),
    path(
        "staff/orders/<int:order_id>/status/",
        staff_views.StaffOrderStatusView.as_view(),
    ),
    path(
        "staff/orders/<int:order_id>/assign/",
        staff_views.StaffOrderAssignView.as_view(),
    ),
]
