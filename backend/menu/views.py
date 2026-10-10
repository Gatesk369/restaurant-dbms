from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from menu.models import MenuItem


class MenuListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(MenuItem.available())
