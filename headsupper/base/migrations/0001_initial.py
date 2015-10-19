# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.utils.timezone
import jsonfield.fields
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Payload',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('payload', jsonfield.fields.JSONField()),
                ('http_error', models.IntegerField()),
                ('messages', jsonfield.fields.JSONField()),
                ('date', models.DateTimeField(default=django.utils.timezone.now)),
            ],
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('github_full_name', models.CharField(max_length=200)),
                ('trigger_word', models.CharField(default=b'Headsup', max_length=100)),
                ('case_sensitive_trigger_word', models.BooleanField(default=False)),
                ('github_webhook_secret', models.CharField(max_length=100)),
                ('send_to', models.TextField()),
                ('send_cc', models.TextField(null=True, blank=True)),
                ('send_bcc', models.TextField(null=True, blank=True)),
                ('cc_commit_author', models.BooleanField(default=False)),
                ('on_tag_only', models.BooleanField(default=False)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('modified', models.DateTimeField(auto_now=True)),
                ('creator', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='payload',
            name='project',
            field=models.ForeignKey(to='base.Project', null=True),
        ),
    ]
