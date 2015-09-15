from django.db import models


class Project(models.Model):
    # e.g. mozilla/socorro
    github_full_name = models.CharField(max_length=200)

    # This'll match '^Headsup: ...'
    trigger_word = models.CharField(default='Headsup', max_length=100)
    case_sensitive_trigger_word = models.BooleanField(default=False)

    # optional
    github_webhook_secret = models.CharField(
        blank=True, null=True, max_length=100
    )

    # email(s)
    send_to = models.TextField()
    send_cc = models.TextField(blank=True, null=True)
    send_bcc = models.TextField(blank=True, null=True)
    cc_commit_author = models.BooleanField(default=False)

    on_tag_only = models.BooleanField(default=False)

    def __repr__(self):
        return '<%s %r>' % (self.__class__.__name__, self.github_full_name)
