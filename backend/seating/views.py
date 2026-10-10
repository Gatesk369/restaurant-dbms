import uuid

from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from seating.models import Customer, Table


class CustomerCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]  # stops someone spamming the customers table

    def post(self, request):
        try:
            table_id = int(request.data.get("table_id"))
        except (TypeError, ValueError):
            raise ValidationError({"table_id": "Enter a valid table number."})
        if not 0 < table_id < 2**31 or Table.get(table_id) is None:
            raise ValidationError({"table_id": "That table doesn't exist."})

        customer = Customer.create(table_id=table_id, session_token=str(uuid.uuid4()))
        return Response(
            {
                "customer_id": customer["customer_id"],
                "table_id": customer["table_id"],
                "session_token": customer["session_token"],
            },
            status=201,
        )
