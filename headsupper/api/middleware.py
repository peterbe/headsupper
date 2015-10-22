import json

from django import http
from django.middleware.csrf import CsrfViewMiddleware


class JsonBodyCsrfViewMiddleware(CsrfViewMiddleware):

    def process_view(self, request, view_func, view_args, view_kwargs):
        if getattr(view_func, 'csrf_exempt', False):
            return None
        try:
            body = json.loads(request.body)
            request.POST = request.POST.copy()
            try:
                request.POST['csrfmiddlewaretoken'] = (
                    body['csrfmiddlewaretoken']
                )
            except KeyError:
                return http.JsonResponse(
                    {'error': 'Missing csrfmiddlewaretoken'},
                    status=403
                )
        except ValueError:
            if request.body and not request.path.startswith('/admin'):
                return http.JsonResponse(
                    {'error': 'Invalid request body'},
                    status=400
                )
        return super(JsonBodyCsrfViewMiddleware, self).process_view(
            request, view_func, view_args, view_kwargs
        )
