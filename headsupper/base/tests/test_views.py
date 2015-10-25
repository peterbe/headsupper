import hmac
import hashlib
import json
import os

import mock

from django.core.urlresolvers import reverse
from django.test import TestCase
from django.conf import settings
from django.core import mail
from django.contrib.auth import get_user_model

from headsupper.base.models import Project, Payload


sample_dir = os.path.dirname(__file__)

samples = {
    'first-line': os.path.join(sample_dir, 'sample-first-line.json'),
    'tagged': os.path.join(sample_dir, 'sample-tagged.json'),
}

TAGGED_RESPONSE = json.load(open(os.path.join(sample_dir, 'tags.json')))
COMMITS_RESPONSE = json.load(open(os.path.join(sample_dir, 'commits.json')))


class Response(object):
    def __init__(self, content=None, status_code=200, headers=None):
        self.content = content
        self.status_code = status_code
        self.headers = headers or {}

    def json(self):
        return self.content

    def iter_content(self, chunk_size=1024):
        increment = 0
        while True:
            chunk = self.content[increment: increment + chunk_size]
            increment += chunk_size
            if not chunk:
                break
            yield chunk


class Tests(TestCase):

    @classmethod
    def setUpClass(cls):
        super(Tests, cls).setUpClass()
        settings.GITHUB_API_ROOT = 'https://api-example'

        cls.user = get_user_model().objects.create(username='peterbe')

    url = reverse('base:home')

    def _send(self, sample, secret=None):
        headers = {}
        with open(samples[sample]) as f:
            payload = f.read()
            if secret:
                signature = 'sha1=' + hmac.new(
                    secret.encode('utf-8'),
                    payload,
                    hashlib.sha1
                ).hexdigest()
                headers['HTTP_X_HUB_SIGNATURE'] = signature
            return self.client.post(
                self.url,
                content_type='application/json',
                data=payload,
                **headers
            )

    def test_view_home(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        response = self.client.head(self.url)
        self.assertEqual(response.status_code, 200)
        response = self.client.options(self.url)
        self.assertEqual(response.status_code, 405)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 405)

    def test_no_matched_project(self):
        response = self._send('first-line')
        self.assertEqual(response.status_code, 400)
        self.assertTrue('No project by the name' in response.content)

    def test_send_gibberish(self):
        response = self.client.post(
            self.url,
            content_type='application/json',
            data='xxx'
        )
        self.assertEqual(response.status_code, 400)

    def test_missing_signature(self):
        project = Project.objects.create(
            github_full_name='peterbe/headsupper',
            github_webhook_secret='secret',
            creator=self.user,

        )
        response = self._send('first-line')
        self.assertEqual(response.status_code, 401)
        self.assertTrue('Missing X-Hub-Signature header' in response.content)

        ping, = Payload.objects.all()
        self.assertEqual(project, ping.project)
        self.assertEqual(ping.http_error, 401)

    def test_wrong_secret(self):
        project = Project.objects.create(
            github_full_name='peterbe/headsupper',
            github_webhook_secret='secret',
            creator=self.user,

        )
        response = self._send('first-line', 'different')
        self.assertEqual(response.status_code, 403)

        ping, = Payload.objects.all()
        self.assertEqual(project, ping.project)
        self.assertEqual(ping.http_error, 403)

    def test_valid(self):
        project = Project.objects.create(
            github_full_name='peterbe/headsupper',
            github_webhook_secret='secret',
            send_to='peterbe@example.com',
            creator=self.user,
        )
        assert project.on_branch == 'master'
        response = self._send('first-line', 'secret')
        self.assertEqual(response.status_code, 201)
        email = mail.outbox[-1]
        self.assertEqual(email.subject, 'Headsup! On peterbe/headsupper')
        html, mime_type = email.alternatives[0]
        self.assertEqual(mime_type, 'text/html')
        self.assertTrue('Tag:' not in html)
        self.assertTrue('This changes things' in html)

        ping, = Payload.objects.all()
        self.assertEqual(project, ping.project)
        self.assertEqual(ping.http_error, 201)

    def test_wrong_branch(self):
        project = Project.objects.create(
            github_full_name='peterbe/headsupper',
            github_webhook_secret='secret',
            send_to='peterbe@example.com',
            creator=self.user,
            on_branch='deployment',
        )
        response = self._send('first-line', 'secret')
        self.assertEqual(response.status_code, 200)
        self.assertTrue('Not the right branch' in response.content)
        assert len(mail.outbox) == 0

        ping, = Payload.objects.all()
        self.assertEqual(project, ping.project)
        self.assertEqual(ping.http_error, 200)
        self.assertFalse(ping.messages)

    @mock.patch('requests.get')
    def test_tagged_commit(self, rget):

        def mocked_get(url):
            if '/tags' in url:
                return Response(TAGGED_RESPONSE)
            if '/commits' in url:
                return Response(COMMITS_RESPONSE)
            raise NotImplementedError(url)

        rget.side_effect = mocked_get

        project = Project.objects.create(
            github_full_name='peterbe/headsupper',
            github_webhook_secret='secret',
            on_tag_only=True,
            send_to='peterbe@example.com',
            creator=self.user,
        )
        response = self._send('tagged', 'secret')
        self.assertEqual(response.status_code, 201)
        email = mail.outbox[-1]
        self.assertEqual(email.subject, 'Headsup! On peterbe/headsupper')
        html, mime_type = email.alternatives[0]
        self.assertEqual(mime_type, 'text/html')
        self.assertTrue('Tag:' in html)
        self.assertTrue('This changes things' in html)

        ping, = Payload.objects.all()
        self.assertEqual(ping.project, project)
        self.assertEqual(ping.http_error, 201)
        message1 = ping.messages[0]['message']
        self.assertTrue(
            "I'm going to test if email sending works." in message1
        )
        message2 = ping.messages[1]['message']
        self.assertTrue(
            'This changes things' in message2
        )
