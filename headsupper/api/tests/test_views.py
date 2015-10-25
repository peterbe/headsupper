import os
import json

import mock

from django.core.urlresolvers import reverse
from django.test import TestCase
from django.conf import settings
from django.contrib.auth import get_user_model

from headsupper.base.models import Project
from headsupper.base.tests.test_views import Response


sample_dir = os.path.dirname(__file__)

SAMPLE_REPO = json.load(open(os.path.join(sample_dir, 'sample-repo.json')))


class Tests(TestCase):

    @classmethod
    def setUpClass(cls):
        super(Tests, cls).setUpClass()
        settings.AUTHENTICATION_BACKENDS += (
            'django.contrib.auth.backends.ModelBackend',
        )
        settings.GITHUB_API_ROOT = 'https://api.gitthubb.xxx'

    def _login(self):
        user, __ = get_user_model().objects.get_or_create(
            username='bob',
            email='bob@example.com',
            first_name='Bob',
            last_name='Example',
        )
        user.set_password('secret')
        user.save()
        assert self.client.login(username='bob', password='secret')
        return user

    def post_json(self, path, data=None, **extra):
        data = data or {}
        extra['content_type'] = 'application/json'
        return self.client.post(path, json.dumps(data), **extra)

    def test_signed_in(self):
        url = reverse('api:signedin')

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), {'username': None})

        self._login()
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), {
            'username': 'bob',
            'first_name': 'Bob',
            'last_name': 'Example',
            'email': 'bob@example.com',
        })

    def test_csrfmiddlewaretoken(self):
        url = reverse('api:csrfmiddlewaretoken')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(json.loads(response.content)['csrf_token'])

    def test_list_projects(self):
        url = reverse('api:list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            json.loads(response.content),
            {'error': 'You must be logged in'}
        )
        user = self._login()
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json.loads(response.content),
            {'projects': []}
        )
        project = Project.objects.create(
            creator=user,
            github_full_name='peterbe/headsupper',
            github_webhook_secret='secret',
            send_to='mail@example.com',
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json.loads(response.content),
            {'projects': [{
                'case_sensitive_trigger_word': False,
                'github_full_name': 'peterbe/headsupper',
                'github_webhook_secret': 'secret',
                'id': project.pk,
                'on_tag_only': False,
                'send_to': 'mail@example.com',
                'send_cc': None,
                'send_bcc': None,
                'trigger_word': 'Headsup',
                'on_branch': 'master',
            }]}
        )

    @mock.patch('requests.get')
    def test_add_project(self, rget):

        def mocked_get(url):
            if url.endswith('/repos/xxx/yyy'):
                return Response('not found', status_code=404)
            if url.endswith('/repos/peterbe/headsupper'):
                return Response(SAMPLE_REPO)
            raise NotImplementedError(url)

        rget.side_effect = mocked_get

        url = reverse('api:add')
        data = {}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            json.loads(response.content),
            {'error': 'Invalid request body'}
        )
        response = self.post_json(url, data)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            json.loads(response.content),
            {'error': 'Missing csrfmiddlewaretoken'}
        )

        user = self._login()
        data = {
            'csrfmiddlewaretoken': 'xxx',
        }
        response = self.post_json(url, data)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(json.loads(response.content)['_errors'])
        data['github_full_name'] = 'xxx/yyy'
        data['github_webhook_secret'] = 'secret'
        data['send_to'] = 'xxx'
        response = self.post_json(url, data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json.loads(response.content),
            {'_errors': {
                'send_to': ["'xxx' not a valid email address"],
                'github_full_name': [
                    'Not found as a publically available GitHub project'
                ],
            }}
        )
        data['send_to'] = 'me@example.com'
        data['github_full_name'] = 'peterbe/headsupper'
        response = self.post_json(url, data)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(json.loads(response.content)['project'])

        project, = Project.objects.filter(creator=user)
        self.assertEqual(
            project.trigger_word,
            Project._meta.get_field('trigger_word').default
        )

    def test_delete_project(self):
        user = self._login()
        project = Project.objects.create(
            creator=user,
            github_full_name='peterbe/headsupper',
            github_webhook_secret='secret',
            send_to='mail@example.com',
        )
        url = reverse('api:delete', args=(project.pk,))
        data = {}
        response = self.post_json(url, data)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            json.loads(response.content),
            {'error': 'Missing csrfmiddlewaretoken'}
        )
        data = {'csrfmiddlewaretoken': 'anything'}
        response = self.post_json(url, data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json.loads(response.content),
            {'ok': True}
        )
        self.assertEqual(Project.objects.all().count(), 0)

    @mock.patch('requests.get')
    def test_preview_github_project(self, rget):

        def mocked_get(url):
            if url.endswith('/repos/xxx/yyy'):
                return Response('not found', status_code=404)
            if url.endswith('/repos/peterbe/headsupper'):
                return Response(SAMPLE_REPO)
            raise NotImplementedError(url)

        rget.side_effect = mocked_get

        self._login()
        url = reverse('api:preview_github_full_name')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

        response = self.client.get(url, {'full_name': 'xxx/yyy'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json.loads(response.content),
            {'project': None}
        )

        response = self.client.get(url, {'full_name': 'peterbe/headsupper'})
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(
            json.loads(response.content),
            {'project': None}
        )
        self.assertTrue(json.loads(response.content)['project'])
