# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.utils.timezone
import jsonfield.fields


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0001_initial'),
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
                ('project', models.ForeignKey(to='base.Project', null=True)),
            ],
        ),
    ]
