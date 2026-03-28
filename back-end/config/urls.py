"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path

from api import admin_router, user_router
from .views import cached_media_serve


def health_check(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('health/', health_check),
    path('dbadmin/', admin.site.urls),
    path('api/admin/', include(admin_router)),
    path('api/', include(user_router)),
]

if not settings.USE_S3:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', cached_media_serve, name='cached-media-serve'),
    ]
