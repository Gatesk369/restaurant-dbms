from django.urls import path

from seating.views import CustomerCreateView, TableListView

urlpatterns = [
    path("tables/", TableListView.as_view()),
    path("customers/", CustomerCreateView.as_view()),
]
