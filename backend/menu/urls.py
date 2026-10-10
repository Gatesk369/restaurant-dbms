from django.urls import path

from menu.views import MenuListView

urlpatterns = [path("menu/", MenuListView.as_view())]
