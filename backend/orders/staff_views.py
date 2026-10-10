from accounts.auth import role_required
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from orders import staff_services as svc

INT_MAX = 2**31 - 1


class StaffOrderQueueView(APIView):
    permission_classes = [role_required("kitchen", "wait_staff", "cashier", "manager")]

    def get(self, request):
        statuses = [s for s in request.query_params.get("status", "").split(",") if s]
        return Response(svc.order_queue(request.user, statuses))


class StaffOrderStatusView(APIView):
    permission_classes = [role_required("kitchen", "wait_staff", "manager")]

    def post(self, request, order_id):
        new_status = str(request.data.get("status", "")).strip()
        return Response(svc.change_status(request.user, order_id, new_status))


class StaffOrderAssignView(APIView):
    permission_classes = [role_required("manager")]

    def post(self, request, order_id):
        try:
            staff_id = int(request.data.get("staff_id"))
        except (TypeError, ValueError):
            raise ValidationError({"staff_id": "Enter a valid staff id."})
        if not 0 < staff_id <= INT_MAX:
            raise ValidationError({"staff_id": "Enter a valid staff id."})
        return Response(svc.assign_order(order_id, staff_id))
