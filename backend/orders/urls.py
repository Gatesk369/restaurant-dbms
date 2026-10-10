from django.urls import path

from orders import views

urlpatterns = [
    path("my/orders/", views.MyOrdersView.as_view()),
    path("my/orders/<int:order_id>/", views.MyOrderDetailView.as_view()),
    path("my/orders/<int:order_id>/cancel/", views.MyOrderCancelView.as_view()),
]
