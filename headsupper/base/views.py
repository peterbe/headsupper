import json
import os
import time
import hashlib, base64, hmac

from django import http
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

SECRET = "My Secret"

@csrf_exempt
def home(request):
    if request.method == 'POST':
        pass
    if not os.path.isdir(settings.MEDIA_ROOT):
        os.mkdir(settings.MEDIA_ROOT)


    if not request.META.get('HTTP_X_HUB_SIGNATURE'):
        return http.HttpResponse(
            'Missing X-Hub-Signature header',
            status=401
        )
    github_signature = request.META['HTTP_X_HUB_SIGNATURE']
    print "GITHUB_SIGNATURE", repr(github_signature)
    payload = request.body
    print "PAYLOAD", type(payload), repr(payload)
    signature = hmac.new(SECRET, payload, hashlib.sha1).hexdigest()
    print "SIGNATURE", repr(signature)
    if not hmac.compare_digest('sha1=' + signature, github_signature):
        return http.HttpResponse(
            "Webhook secret doesn't match GitHub signature",
            status=403
        )

    body = json.loads(payload)
    dbg_filename = os.path.join(
        settings.MEDIA_ROOT,
        '%.2f__%s.json' % (
            time.time(),
            github_signature.replace('sha1=', '')
        )
    )
    # print repr(request.body)
    with open(dbg_filename, 'w') as f:
        f.write(payload)
        print dbg_filename
    return http.HttpResponse("OK\n")
