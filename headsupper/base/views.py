import re
import json
import os
import time
import hashlib, base64, hmac

from django import http
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from .models import Project


@csrf_exempt
def home(request):
    if request.method == 'POST':
        pass
    if not os.path.isdir(settings.MEDIA_ROOT):
        os.mkdir(settings.MEDIA_ROOT)

    payload = request.body
    body = json.loads(payload)

    try:
        full_name = body['repository']['full_name']
        project = Project.objects.get(github_full_name=full_name)
    except Project.DoesNotExist:
        return http.HttpResponse(
            "No project by the name '%s'" % (full_name,),
            status=404
        )

    if not request.META.get('HTTP_X_HUB_SIGNATURE'):
        return http.HttpResponse(
            'Missing X-Hub-Signature header',
            status=401
        )
    github_signature = request.META['HTTP_X_HUB_SIGNATURE']
    # print "GITHUB_SIGNATURE", repr(github_signature)

    # print "PAYLOAD", type(payload), repr(payload)
    signature = hmac.new(
        project.github_webhook_secret.encode('utf-8'),
        payload,
        hashlib.sha1
    ).hexdigest()
    # print "SIGNATURE", repr(signature)
    if not hmac.compare_digest('sha1=' + signature, github_signature):
        return http.HttpResponse(
            "Webhook secret doesn't match GitHub signature",
            status=403
        )


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

    from pprint import pprint
    # pprint(body)
    author_emails = set()

    flags = re.MULTILINE | re.DOTALL
    if not project.case_sensitive_trigger_word:
        flags = flags | re.IGNORECASE
    trigger_word = project.trigger_word
    regex = re.compile('^%s(:|\!| )(.*)' % re.escape(trigger_word), flags)
    messages = []
    for commit in body['commits']:

        # if we do decide to CC the "author" we'll CC the committer too
        if commit['author'].get('email'):
            author_emails.add(commit['author']['email'])
        if commit['committer'].get('email'):
            author_emails.add(commit['author']['email'])

        message = commit['message']
        # print regex.findall(message)
        if regex.findall(message):
            headsup_message = regex.findall(message)[0][1].strip()
            messages.append({
                'message': headsup_message,
                'html_url': commit['url'],
                'author': commit['author'],
                'committer': commit['committer']
            })

    if not messages:
        return http.HttpResponse("No trigger messages\n")

    print "MESSAGES"
    print messages

    # Is this a tag?
    # Does it have the secret trigger word?
    #
    return http.HttpResponse("OK\n")
