"""
Django settings for headsupper project.

For more information on this file, see
https://docs.djangoproject.com/en/1.7/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.7/ref/settings/
"""

import os

import dj_database_url
from decouple import Csv, config


# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.7/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', cast=bool)
DEBUG_PROPAGATE_EXCEPTIONS = config(
    'DEBUG_PROPAGATE_EXCEPTIONS',
    False,
    cast=bool
)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())


# Application definition

INSTALLED_APPS = [
    # Project specific apps
    'headsupper.base',

    # Third party
    'django_jinja',
    'pipeline',

    # Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    # allauth
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.github',
]

for app in config('EXTRA_APPS', default='', cast=Csv()):
    INSTALLED_APPS.append(app)


MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 'csp.middleware.CSPMiddleware',
)

ROOT_URLCONF = 'headsupper.urls'

WSGI_APPLICATION = 'headsupper.wsgi.application'


# Database
DATABASES = {
    'default': config(
        'DATABASE_URL',
        cast=dj_database_url.parse
    )
}

# Internationalization

LANGUAGE_CODE = config('LANGUAGE_CODE', default='en-us')

TIME_ZONE = config('TIME_ZONE', default='UTC')

USE_I18N = config('USE_I18N', default=True, cast=bool)

USE_L10N = config('USE_L10N', default=True, cast=bool)

USE_TZ = config('USE_TZ', default=True, cast=bool)

STATIC_ROOT = config('STATIC_ROOT', default=os.path.join(BASE_DIR, 'static'))
STATIC_URL = config('STATIC_URL', '/static/')
# STATICFILES_STORAGE = 'whitenoise.django.GzipManifestStaticFilesStorage'

# STATICFILES_STORAGE = 'pipeline.storage.PipelineCachedStorage'
STATICFILES_STORAGE = 'pipeline.storage.PipelineStorage'

STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    'pipeline.finders.CachedFileFinder',
    'pipeline.finders.PipelineFinder',
)

# MEDIA_ROOT = config('MEDIA_ROOT', default=os.path.join(BASE_DIR, 'media'))
# MEDIA_URL = config('MEDIA_URL', '/media/')

SESSION_COOKIE_SECURE = config(
    'SESSION_COOKIE_SECURE', default=not DEBUG, cast=bool)


from django_jinja.builtins import DEFAULT_EXTENSIONS

TEMPLATES = [
    {
        'BACKEND': 'django_jinja.backend.Jinja2',
        'APP_DIRS': True,
        'OPTIONS': {
            'match_extension': '.jinja',
            'newstyle_gettext': True,
            'context_processors': [
                'headsupper.base.context_processors.settings',
                'headsupper.base.context_processors.i18n',
                # 'django.template.context_processors.request', ##???
            ],
            'extensions': DEFAULT_EXTENSIONS + [
                'pipeline.templatetags.ext.PipelineExtension',
            ],
        }
    },
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.request',
                'django.template.context_processors.debug',
                'django.template.context_processors.i18n',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.tz',
                # 'django.contrib.messages.context_processors.messages',
            ],
        }
    },
]

# Django-CSP
CSP_DEFAULT_SRC = (
    "'self'",
    "'unsafe-inline'",
)
CSP_FONT_SRC = (
    "'self'",
    # 'http://*.mozilla.net',
    # 'https://*.mozilla.net',
    # 'http://*.mozilla.org',
    # 'https://*.mozilla.org',
    'http://fonts.googleapis.com',
    'https://fonts.googleapis.com',
    'http://fonts.gstatic.com',
    'https://fonts.gstatic.com',
)
# CSP_IMG_SRC = (
#     "'self'",
#     'http://*.mozilla.net',
#     'https://*.mozilla.net',
#     'http://*.mozilla.org',
#     'https://*.mozilla.org',
# )
# CSP_SCRIPT_SRC = (
#     "'self'",
#     'http://*.mozilla.org',
#     'https://*.mozilla.org',
#     'http://*.mozilla.net',
#     'https://*.mozilla.net',
# )
CSP_STYLE_SRC = (
    "'self'",
    "'unsafe-inline'",
    'http://fonts.googleapis.com',
    'https://fonts.googleapis.com',
#     'http://*.mozilla.org',
#     'https://*.mozilla.org',
#     'http://*.mozilla.net',
#     'https://*.mozilla.net',
)

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = config(
    'EMAIL_HOST',
    default='localhost'
)
EMAIL_PORT = config(
    'EMAIL_PORT',
    default=25,
    cast=int
)
EMAIL_HOST_USER = config(
    'EMAIL_HOST_USER',
    default=''
)
EMAIL_HOST_PASSWORD = config(
    'EMAIL_HOST_PASSWORD',
    default=''
)
EMAIL_USE_TLS = config(
    'EMAIL_USE_TLS',
    False,
    cast=bool
)

EMAIL_FROM_NAME = 'Headsupper'
EMAIL_FROM_EMAIL = 'oi@headsupper.io'


GITHUB_API_ROOT = 'https://api.github.com'


AUTHENTICATION_BACKENDS = (
    'allauth.account.auth_backends.AuthenticationBackend',
)
SITE_ID = 1


LOGIN_REDIRECT_URL = '/'

# django-allauth stuff
ACCOUNT_AUTHENTICATION_METHOD = 'username'
ACCOUNT_UNIQUE_EMAIL = False
ACCOUNT_LOGOUT_REDIRECT_URL = '/'
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_EMAIL_VERIFICATION = 'none'  # might change this some day
ACCOUNT_LOGOUT_ON_GET = True  # yolo
ACCOUNT_DEFAULT_HTTP_PROTOCOL = config(
    'ACCOUNT_DEFAULT_HTTP_PROTOCOL',
    default='http'
)


PIPELINE_DISABLE_WRAPPER = True
PIPELINE_CSS = {
    'main': {
        'source_filenames': (
          'css/semantic.min.css',
        #   'css/colors/*.css',
        #   'css/layers.css'
        ),
        'output_filename': 'css/main.css',
        # 'extra_context': {
        #     'media': 'screen,projection',
        # },
    },
}
PIPELINE_JS = {
    'react': {
        'source_filenames': (
        #   'js/react-0.13.3.min.js',
          'js/react-0.13.3.js',
        ),
        'output_filename': 'js/react.js',
        # 'extra_context': {
        #     'media': 'screen,projection',
        # },
    },
    'main': {
        'source_filenames': (
        #   'js/app.jsx',
        #   'js/require.js',
        #   'js/app.es6',
          'js/app.browserify.js',
        ),
        'output_filename': 'js/main.js',
        # 'extra_context': {
        #     'media': 'screen,projection',
        # },
    },
}
PIPELINE_JS_COMPRESSOR = None
PIPELINE_COMPILERS = (
    'pipeline_browserify.compiler.BrowserifyCompiler',
    # 'pipeline.compilers.es6.ES6Compiler',
    # 'react.utils.pipeline.JSXCompiler',
)

PIPELINE_BROWSERIFY_ARGUMENTS = '-t babelify'
if DEBUG:
    PIPELINE_BROWSERIFY_ARGUMENTS += ' -d'
