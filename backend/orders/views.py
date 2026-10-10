# orders/views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from seating.auth import CustomerAuthentication

from orders import services


class CustomerAPIView(APIView):
    authentication_classes = [CustomerAuthentication]
    permission_classes = [IsAuthenticated]


class MyOrdersView(CustomerAPIView):
    def get(self, request):
        return Response(services.get_customer_orders(request.user.customer_id))

    def post(self, request):
        order = services.place_order(request.user, request.data.get("items"))
        return Response(order, status=201)


class MyOrderDetailView(CustomerAPIView):
    def get(self, request, order_id):
        return Response(services.get_customer_order(request.user.customer_id, order_id))


class MyOrderCancelView(CustomerAPIView):
    def post(self, request, order_id):
        return Response(
            services.cancel_customer_order(request.user.customer_id, order_id)
        )
