import requests

from django.conf import settings


def find_github_project(full_name):
    url = settings.GITHUB_API_ROOT + '/repos/{}'.format(full_name)
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
