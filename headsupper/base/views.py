import re
import json
import hashlib
import hmac
import logging

import requests
from html2text import html2text

from django import http
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .models import Project, Payload


logger = logging.getLogger('headsupper.base')


@csrf_exempt
def home(request):
    if request.method == 'HEAD':
        return http.HttpResponse('OK\n')
    if request.method == 'GET':
        return http.HttpResponse(
            'You should be seeing the static index.html page\n'
        )
    if request.method != 'POST':
        return http.HttpResponse('Method not allowed', status=405)

    payload = request.body
    try:
        body = json.loads(payload)
    except ValueError:
        return http.HttpResponseBadRequest("Not a valid JSON payload")

    ping = Payload(payload=body, http_error=201)

    try:
        full_name = body['repository']['full_name']
        logger.info("Received payload from {}".format(full_name))
        project = Project.objects.get(github_full_name=full_name)
        ping.project = project
        ping.save()
    except Project.DoesNotExist:
        logger.info("No project by the name {}".format(full_name))
        ping.http_error = 400
        ping.save()
        return http.HttpResponse(
            "No project by the name '%s'" % (full_name,),
            status=400
        )
    if not request.META.get('HTTP_X_HUB_SIGNATURE'):
        ping.http_error = 401
        ping.save()
        return http.HttpResponse(
            'Missing X-Hub-Signature header',
            status=401
        )
    github_signature = request.META['HTTP_X_HUB_SIGNATURE']
    signature = hmac.new(
        project.github_webhook_secret.encode('utf-8'),
        payload,
        hashlib.sha1
    ).hexdigest()
    if hasattr('hmac', 'compare_digest'):
        matched = hmac.compare_digest('sha1=' + signature, github_signature)
    else:
        matched = 'sha1=' + signature == github_signature
    if not matched:
        ping.http_error = 403
        ping.save()
        return http.HttpResponse(
            "Webhook secret doesn't match GitHub signature",
            status=403
        )

    tag_name = tag_url = None
    if 'ref' not in body and body.get('hook'):
        # it's a test push!
        ping.http_error = 200
        ping.save()
        return http.HttpResponse("Test hook\n")

    if body['ref'].startswith('refs/tags'):
        # it might be a tag!
        __, tag_name = body['ref'].split('refs/tags/')
        # It's a tag!
        # tag = "BLA"
        # we need to find out what the last tag was
        url = settings.GITHUB_API_ROOT + '/repos/%s/tags' % (
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
        url = settings.GITHUB_API_ROOT + '/repos/%s/commits' % (
            project.github_full_name,
        )
        response = requests.get(url)
        commits = []

        for commit in response.json():
            if commit['sha'] == base_sha:
                break
            else:
                commits.append(commit['commit'])
    elif body['ref'].startswith('refs/heads/'):
        commit_branch = body['ref'].split('refs/heads/')[1]
        if commit_branch != project.on_branch:
            ping.http_error = 200
            ping.save()
            return http.HttpResponse("Not the right branch\n")

        commits = body['commits']

    messages = find_commits_messages(
        project,
        commits,
    )

    if not messages:
        ping.http_error = 200
        ping.save()
        return http.HttpResponse("No trigger messages\n")

    ping.messages = messages
    ping.save()

    send_messages(
        project,
        messages,
        tag={
            'name': tag_name,
            'url': tag_url,
        }
    )
    # print "MESSAGES"
    # print messages

    return http.HttpResponse("OK\n", status=201)


def find_commits_messages(project, commits):
    flags = re.MULTILINE | re.DOTALL
    if not project.case_sensitive_trigger_word:
        flags = flags | re.IGNORECASE
    trigger_word = project.trigger_word
    regex = re.compile(r'\b%s(:|\!| )(.*)' % re.escape(trigger_word), flags)

    messages = []
    for commit in commits:
        message = commit['message']
        if regex.findall(message):
            headsup_message = regex.findall(message)[0][1].strip()
            messages.append({
                'message': headsup_message,
                'html_url': commit['url'],
                'author': commit['author'],
                'committer': commit['committer']
            })
    return messages


def extract_email_addresses(text):
    return [
        x.strip() for x in text.replace(';', '\n').splitlines()
        if x.strip()
    ]


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
        cc=send_cc,
        bcc=send_bcc,
    )
    email.attach_alternative(html_body, "text/html")
    assert email.send()
