from django.conf.urls import patterns, url

from . import views


urlpatterns = patterns(
    '',
    url(
        r'^signedin$',
        views.signedin,
        name='signedin'
    ),
    url(
        r'^projects$',
        views.list_projects,
        name='list'
    ),
    url(
        r'^projects/add$',
        views.add_project,
        name='add'
    ),
    url(
        r'^projects/delete/(?P<id>\d+)$',
        views.delete_project,
        name='delete'
    ),
    url(
        r'^csrf$',
        views.csrfmiddlewaretoken,
        name='csrfmiddlewaretoken'
    ),
    url(
        r'^preview-github-project$',
        views.preview_github_full_name,
        name='preview_github_full_name'
    ),
)
