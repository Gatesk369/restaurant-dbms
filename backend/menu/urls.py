from django.urls import path

from menu import views

urlpatterns = [
    path("menu/", views.MenuListView.as_view()),
    path("staff/menu/", views.StaffMenuView.as_view()),
    path("staff/menu/<int:menu_item_id>/", views.StaffMenuDetailView.as_view()),
]
