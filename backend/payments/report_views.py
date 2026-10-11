from accounts.auth import role_required
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from payments import reports


class ReportView(APIView):
    permission_classes = [role_required("manager")]

    def get(self, request):
        start, end = reports.date_range(request.query_params)
        return Response({"from": start, "to": end, **self.build(request, start, end)})

    def build(self, request, start, end):
        raise NotImplementedError


class DailySalesView(ReportView):
    def build(self, request, start, end):
        rows, totals = reports.daily_sales(start, end)
        return {"rows": rows, "totals": totals}


class TopItemsView(ReportView):
    def build(self, request, start, end):
        try:
            limit = int(request.query_params.get("limit", 10))
        except ValueError:
            raise ValidationError({"limit": "Enter a whole number."})
        if not 1 <= limit <= 50:
            raise ValidationError({"limit": "Use a number between 1 and 50."})
        return {"rows": reports.top_items(start, end, limit)}


class WaiterPerformanceView(ReportView):
    def build(self, request, start, end):
        return {"rows": reports.waiter_performance(start, end)}


class TableTurnoverView(ReportView):
    def build(self, request, start, end):
        return {"rows": reports.table_turnover(start, end)}


class PaymentMethodsView(ReportView):
    def build(self, request, start, end):
        return {"rows": reports.payment_methods(start, end)}
