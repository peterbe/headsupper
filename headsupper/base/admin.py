from django.contrib import admin
from .models import Project


class ProjectAdmin(admin.ModelAdmin):
    verbose_name = 'Project'
    list_display = ('github_full_name', 'trigger_word')



admin.site.register(Project, ProjectAdmin)
