from accounts.auth import role_required
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.services import pay_order


class PayOrderView(APIView):
    permission_classes = [role_required("cashier")]

    def post(self, request, order_id):
        method = str(request.data.get("payment_method", ""))
        return Response(pay_order(request.user, order_id, method), status=201)
