import json

from django.middleware.csrf import CsrfViewMiddleware


class JsonBodyCsrfViewMiddleware(CsrfViewMiddleware):

    def process_view(self, request, *args, **kwargs):
        try:
            body = json.loads(request.body)
            request.POST = request.POST.copy()
            request.POST['csrfmiddlewaretoken'] = (
                body['csrfmiddlewaretoken']
            )
        except ValueError:
            if request.body:
                raise
        return super(JsonBodyCsrfViewMiddleware, self).process_view(
            request, *args, **kwargs
        )
