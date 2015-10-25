# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='on_branch',
            field=models.CharField(default=b'master', max_length=200, blank=True),
        ),
    ]
