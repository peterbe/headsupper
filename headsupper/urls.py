from django.conf.urls import patterns, include, url
from django.contrib import admin

import headsupper.base.urls
import headsupper.api.urls


urlpatterns = patterns(
    '',
    url(r'^$', include(headsupper.base.urls, namespace='base')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^accounts/', include('allauth.urls')),
    url(r'^api/', include(headsupper.api.urls, namespace='api')),
)
