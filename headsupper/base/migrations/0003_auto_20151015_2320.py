# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0002_payload'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='github_webhook_secret',
            field=models.CharField(default='anything', max_length=100),
            preserve_default=False,
        ),
    ]
