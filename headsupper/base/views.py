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
    dbg_filename = os.path.join(
        settings.MEDIA_ROOT,
        '%s.json' % int(time.time())
    )
    # print request.META.keys()
    # for key in request.META.keys():
    #     if not (key.startswith('HTTP') or 'X' in key):
    #         continue
    #     print key
    #     print "\t", str(request.META[key])[:100]
    #     print

    github_signature = request.META['HTTP_X_GITHUB_DELIVERY']
    print "GITHUB_SIGNATURE", repr(github_signature)
    payload = request.body
    print "PAYLOAD", type(payload), repr(payload)
    signature = 'sha1=' + hmac.new(SECRET, payload, hashlib.sha1).hexdigest()
    print "SIGNATURE", repr(signature)
    print hmac.compare_digest(signature, github_signature)

    body = json.loads(payload)
    # print repr(request.body)
    with open(dbg_filename, 'w') as f:
        json.dump(body, f, indent=2)
        print dbg_filename
    return http.HttpResponse("OK\n")
