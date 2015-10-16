from django.conf.urls import patterns, include, url

from . import views


urlpatterns = patterns(
    '',
    url(r'^signedin$', views.signedin, name='signedin'),
    url(r'^projects$', views.list_projects, name='list'),
    url(r'^projects/add$', views.add_project, name='add'),
    url(r'^csrf$', views.csrfmiddlewaretoken, name='csrfmiddlewaretoken'),
)
