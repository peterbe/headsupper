# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0002_project_on_branch'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='project',
            name='cc_commit_author',
        ),
    ]
