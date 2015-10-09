# import re
# import json
# import hashlib
# import hmac
import logging

# import requests
# from html2text import html2text

from django import http
# from django.shortcuts import render
# from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.template.context_processors import csrf
# from django.contrib.auth import get_user_model

# from .models import Project, Payload


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
