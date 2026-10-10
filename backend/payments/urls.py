from django.urls import path

from payments.views import PayOrderView

urlpatterns = [path("staff/orders/<int:order_id>/pay/", PayOrderView.as_view())]
