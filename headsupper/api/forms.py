from django import forms
from django.core.validators import validate_email

from headsupper.base.models import Project
from headsupper.base.views import extract_email_addresses


class ProjectForm(forms.ModelForm):

    class Meta:
        model = Project
        fields = (
            'github_full_name',
            'trigger_word',
            'case_sensitive_trigger_word',
            'github_webhook_secret',
            'send_to',
            'send_cc',
            'send_bcc',
            'cc_commit_author',
            'on_tag_only',
        )

    def _clean_send_emails(self, key, required=False):
        value = self.cleaned_data[key]
        emails = extract_email_addresses(value)
        checked = []
        for email in emails:
            try:
                validate_email(email)
            except forms.ValidationError:
                raise forms.ValidationError(
                    "'{}' for a valid email address".format(email)
                )
        if required and not emails:
            raise forms.ValidationError(
                'No valid email address(es)'
            )
        return '\n'.join(emails)

    def clean_send_to(self):
        return self._clean_send_emails('send_to', True)

    def clean_send_cc(self):
        return self._clean_send_emails('send_cc', False)

    def clean_send_bcc(self):
        return self._clean_send_emails('send_bcc', False)
