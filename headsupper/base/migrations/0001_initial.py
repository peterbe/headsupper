# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('github_full_name', models.CharField(max_length=200)),
                ('trigger_word', models.CharField(default=b'Headsup', max_length=100)),
                ('case_sensitive_trigger_word', models.BooleanField(default=False)),
                ('github_webhook_secret', models.CharField(max_length=100, null=True, blank=True)),
                ('send_to', models.TextField()),
                ('send_cc', models.TextField(null=True, blank=True)),
                ('send_bcc', models.TextField(null=True, blank=True)),
                ('cc_commit_author', models.BooleanField(default=False)),
                ('on_tag_only', models.BooleanField(default=False)),
            ],
        ),
    ]
