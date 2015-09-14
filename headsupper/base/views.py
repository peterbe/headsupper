import re
import json
import os
import time
import hashlib, base64, hmac

import requests
from html2text import html2text

from django import http
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

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
    pprint(body)

    # it might be a tag!
    tag_name = tag_url = None
    if body.get('ref', '').startswith('refs/tags'):
        __, tag_name = body['ref'].split('refs/tags/')
        # It's a tag!
        # tag = "BLA"
        # we need to find out what the last tag was
        url = 'https://api.github.com/repos/%s/tags' % (
            project.github_full_name,
        )
        response = requests.get(url)
        next_is_previous = False
        base_sha = None
        for tag_commit in response.json():
            if tag_commit['name'] == tag_name:
                next_is_previous = True
            elif next_is_previous:
                base_sha = tag_commit['commit']['sha']
                tag_url = body['repository']['compare_url'].replace(
                    '{base}', base_sha
                ).replace(
                    '{head}',
                    tag_name
                )
                break
        # now we just need to download all those commits in this span
        url = 'https://api.github.com/repos/%s/commits' % (
            project.github_full_name,
        )
        response = requests.get(url)
        commits = []
        for commit in response.json():
            if commit['sha'] == base_sha:
                break
            else:
                commits.append(commit['commit'])

    messages = find_commits_messages(
        project,
        body['commits'],
    )

    if not messages:
        return http.HttpResponse("No trigger messages\n")

    send_messages(
        project,
        messages,
        tag={
            'name': tag_name,
            'url': tag_url,
        }
    )
    print "MESSAGES"
    print messages
    # Is this a tag?

    return http.HttpResponse("OK\n")


def find_commits_messages(project, commits):
    # author_emails = set()

    flags = re.MULTILINE | re.DOTALL
    if not project.case_sensitive_trigger_word:
        flags = flags | re.IGNORECASE
    trigger_word = project.trigger_word
    regex = re.compile('^%s(:|\!| )(.*)' % re.escape(trigger_word), flags)
    messages = []
    for commit in commits:

        # if we do decide to CC the "author" we'll CC the committer too
        # if commit['author'].get('email'):
        #     author_emails.add(commit['author']['email'])
        # if commit['committer'].get('email'):
        #     author_emails.add(commit['author']['email'])

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
    return messages


def send_messages(project, messages, tag=None):
    """this @messages is a list of dicts that look like this:
        [
            {
                'message': 'Warning this was the heads up message',
                'html_url': 'https://github.com/user/repo/commit/sha',
                'author': {
                    'email': 'some@example.com',
                    'name': 'Some Example',
                    'username': 'someexample',
                },
                'committer': {
                    'email': 'some@example.com',
                    'name': 'Some Example',
                    'username': 'someexample',
                }
            }
        ]

    Note that the message is not the git commit message, but the
    expression that was typed after the trigger word.

    Note that the author and committer CAN be equal.
    Neither name or email is guaranteed in the author and committer.

    The @tag parameter is a None or a dict with keys 'name', 'url'
    """

    subject = "Headsup! On %s" % project.github_full_name
    context = {
        'messages': messages,
        'subject': subject,
        'tag': tag,
        'project': project,
    }

    html_body = render_to_string(
        'headsupper/email.jinja',
        context
    )
    body = html2text(html_body)

    def extract_email_addresses(text):
        return [
            x.strip() for x in text.replace(';', '\n').splitlines()
            if x.strip()
        ]
    send_to = extract_email_addresses(project.send_to)
    send_cc = None
    if project.send_cc:
        send_cc = extract_email_addresses(project.send_cc)
    send_bcc = None
    if project.send_bcc:
        send_bcc = extract_email_addresses(project.send_bcc)
    email = EmailMultiAlternatives(
        subject=subject,
        body=body,
        from_email='%s <%s>' % (
            settings.EMAIL_FROM_NAME,
            settings.EMAIL_FROM_EMAIL,
        ),
        to=send_to,
        # headers=headers,
        cc=send_cc,
        bcc=send_bcc,
    )
    email.attach_alternative(html_body, "text/html")
    print email.send()
