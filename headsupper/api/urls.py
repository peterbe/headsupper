from django.conf.urls import patterns, include, url

from . import views


urlpatterns = patterns(
    '',
    url(r'^signedin$', views.signedin, name='signedin'),
    # url(r'^csrf$', views.csrf, name='crsfmiddlewaretokensignedin'),
)
