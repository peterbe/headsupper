import json
import logging

from django import http
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.template.context_processors import csrf

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


def add_project(request):
    data = json.loads(request.body)
    form = forms.ProjectForm(data)
    if not form.is_valid():
        return http.JsonResponse({'_errors': form.errors})

    #project = form.save()
    return http.JsonResponse({'ok': True})
