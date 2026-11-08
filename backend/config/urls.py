from django.contrib import admin
from django.urls import path, re_path
from django.conf import settings
from django.conf.urls.static import static
from studio import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/content/", views.content),
    path("api/availability/", views.availability),
    path("api/bookings/", views.create_booking),
    path("api/bookings/manage/", views.manage_booking),
    path("robots.txt", views.robots),
    path("sitemap.xml", views.sitemap),
    path("favicon.svg", views.site, {"resource": "favicon.svg"}),
    path("", views.site),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += [re_path(r"^(?P<resource>(?:assets|images|fonts)/.+)$", views.site)]
urlpatterns += [re_path(r"^.*$", views.not_found)]
