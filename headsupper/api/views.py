import json
import logging

from django import http
from django.template.context_processors import csrf
from django.utils.functional import wraps
from django.views.decorators.http import require_POST
from django.forms.models import model_to_dict

from headsupper.base.models import Project, Payload
from . import forms
from . import utils


logger = logging.getLogger('headsupper.api')


def xhr_login_required(view_func):
    """similar to django.contrib.auth.decorators.login_required
    except instead of redirecting it returns a 403 message if not
    authenticated."""
    @wraps(view_func)
    def inner(request, *args, **kwargs):
        if not request.user.is_authenticated():
            return http.HttpResponse(
                json.dumps({'error': "You must be logged in"}),
                content_type='application/json',
                status=403
            )
        return view_func(request, *args, **kwargs)

    return inner


def signedin(request):
    if request.user.is_authenticated():
        data = {
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
        }
    else:
        data = {
            'username': None,
        }
    return http.JsonResponse(data)


def csrfmiddlewaretoken(request):
    t = csrf(request)
    return http.JsonResponse({
        'csrf_token': str(t['csrf_token'])
    })


def project_to_dict(project):
    p = model_to_dict(project)
    p.pop('creator')
    return p


@xhr_login_required
def list_projects(request):
    projects = []
    qs = Project.objects.filter(creator=request.user)
    for project in qs.order_by('created'):
        p = project_to_dict(project)
        payloads = {}
        payloads['times_used'] = Payload.objects.filter(
            project=project,
        ).count()
        payloads['times_messages_sent'] = Payload.objects.filter(
            project=project,
            http_error=201,
        ).count()
        p['payloads'] = payloads
        projects.append(p)
    return http.JsonResponse({'projects': projects})


@require_POST
@xhr_login_required
def add_project(request):
    data = json.loads(request.body)
    form = forms.ProjectForm(data)
    if not form.is_valid():
        return http.JsonResponse({'_errors': form.errors})

    project = form.save(commit=False)
    project.creator = request.user
    default = Project._meta.get_field('trigger_word').default
    project.trigger_word = project.trigger_word or default
    project.save()

    return http.JsonResponse({'project': project_to_dict(project)})


@require_POST
@xhr_login_required
def delete_project(request, id):
    project = Project.objects.get(id=id, creator=request.user)
    project.delete()
    return http.JsonResponse({'ok': True})


@xhr_login_required
def preview_github_full_name(request):
    full_name = request.GET.get('full_name', '').strip()
    if not full_name:
        return http.HttpResponseBadRequest('full_name')
    return http.JsonResponse({
        'project': utils.find_github_project(full_name)
    })
