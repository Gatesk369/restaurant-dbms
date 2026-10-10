from django.urls import path

from seating.views import CustomerCreateView

urlpatterns = [path("customers/", CustomerCreateView.as_view())]
