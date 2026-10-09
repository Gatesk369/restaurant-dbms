from django.contrib.auth.hashers import check_password
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth import make_token
from accounts.models import Staff
from accounts.serializers import (
    LoginResponseSerializer,
    LoginSerializer,
    StaffSummarySerializer,
)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        row = Staff.by_username(username)
        if (
            not row
            or not row["is_active"]
            or not check_password(password, row["password"])
        ):
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        Staff.update(row["staff_id"], last_login=timezone.now())
        response_data = {
            "token": make_token(row["staff_id"]),
            "staff": StaffSummarySerializer(row).data,
        }
        return Response(LoginResponseSerializer(response_data).data)


class MeView(APIView):
    def get(self, request):
        return Response(StaffSummarySerializer(request.user).data)
