import json
import os
import time

from django import http
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings


@csrf_exempt
def home(request):
    if request.method == 'POST':
        pass
    if not os.path.isdir(settings.MEDIA_ROOT):
        os.mkdir(settings.MEDIA_ROOT)
    dbg_filename = os.path.join(
        settings.MEDIA_ROOT,
        '%s.json' % int(time.time())
    )
    body = json.loads(request.body)
    print repr(request.body)
    with open(dbg_filename, 'w') as f:
        json.dump(body, f, indent=2)
        print dbg_filename
    return http.HttpResponse("OK\n")
