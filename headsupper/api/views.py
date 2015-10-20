import json
import logging

from django import http
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.template.context_processors import csrf
from django.contrib.auth.decorators import login_required
from django.forms.models import model_to_dict

from headsupper.base.models import Project
from . import forms


logger = logging.getLogger('headsupper.api')


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


@login_required
def list_projects(request):
    projects = []
    qs = Project.objects.filter(creator=request.user)
    for project in qs.order_by('created'):
        p = model_to_dict(project)
        p['key'] = p.pop('id')
        projects.append(p)
    return http.JsonResponse({'projects': projects})


@login_required
def add_project(request):
    data = json.loads(request.body)
    form = forms.ProjectForm(data)
    if not form.is_valid():
        return http.JsonResponse({'_errors': form.errors})

    cd = form.cleaned_data
    project = Project.objects.create(
        creator=request.user,
        github_full_name=cd['github_full_name'],
        github_webhook_secret=cd['github_webhook_secret'],
        trigger_word=cd['trigger_word'],
        case_sensitive_trigger_word=cd['case_sensitive_trigger_word'],
        send_to=cd['send_to'],
        send_cc=cd['send_cc'],
        send_bcc=cd['send_bcc'],
        cc_commit_author=cd['cc_commit_author'],
        on_tag_only=cd['on_tag_only'],
    )
    p = model_to_dict(project)
    p['key'] = p.pop('id')
    return http.JsonResponse({'project': p})
