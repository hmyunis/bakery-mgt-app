import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="127.0.0.1,localhost").split(",")

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third Party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Local
    "core",
    "users",
    "audit.apps.AuditConfig",
    "inventory",
    "production",
    "sales",
    "notifications",
    "reports",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "audit.middleware.AuditMiddleware",
    "core.middleware.NoCacheMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "djangorestframework_camel_case.middleware.CamelCaseMiddleWare",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "core/static",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database

DATABASE_URL = config("DATABASE_URL")
DATABASES = {"default": dj_database_url.config(default=config("DATABASE_URL"))}

# Cache Configuration (Required for Rate Limiting)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

# Password validation

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
        )
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Addis_Ababa"  # Adjusted for Ethiopia
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "static")
MEDIA_URL = ""
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# User Model

AUTH_USER_MODEL = "users.User"

# Default primary key field type

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="").split(",")
CORS_ALLOW_CREDENTIALS = True

# DRF Configuration

# Rate Limiting Configuration
THROTTLE_ANON_RATE = config("THROTTLE_ANON_RATE", default="100/hour")
THROTTLE_USER_RATE = config("THROTTLE_USER_RATE", default="1000/hour")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        # Custom JWT auth that sets user in thread locals for audit logging
        "audit.authentication.AuditJWTAuthentication",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "core.renderers.CustomCamelCaseJSONRenderer",
        "djangorestframework_camel_case.render.CamelCaseBrowsableAPIRenderer",
    ),
    "DEFAULT_PARSER_CLASSES": (
        "djangorestframework_camel_case.parser.CamelCaseFormParser",
        "djangorestframework_camel_case.parser.CamelCaseMultiPartParser",
        "djangorestframework_camel_case.parser.CamelCaseJSONParser",
    ),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.CustomPagination",
    "PAGE_SIZE": 10,
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": THROTTLE_ANON_RATE,
        "user": THROTTLE_USER_RATE,
    },
}

# JWT Configuration

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),  # Long session for mobile workers
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# Documentation (Spectacular)

SPECTACULAR_SETTINGS = {
    "TITLE": "Bakery API",
    "DESCRIPTION": "API for Bakery Management System",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "CAMELIZE_NAMES": True,
}

# VAPID Configuration for Web Push Notifications
# Generate keys using: python manage.py generate_vapid_keys
VAPID_PRIVATE_KEY = config("VAPID_PRIVATE_KEY", default="")
VAPID_PUBLIC_KEY = config("VAPID_PUBLIC_KEY", default="")
VAPID_EMAIL = config("VAPID_EMAIL", default="admin@bakery.com")
