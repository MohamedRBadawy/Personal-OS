"""Django settings for Personal Life OS."""
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv

load_dotenv(override=True)

BASE_DIR = Path(__file__).resolve().parent.parent


def _env_string(name, default=None):
    value = os.getenv(name)
    if value is None:
        return default
    value = value.strip()
    if value == "":
        return default
    return value


def _env_csv(name, default=None):
    raw_value = os.getenv(name)
    if raw_value is None:
        raw_value = default
    if raw_value is None:
        return []
    return [item.strip() for item in str(raw_value).split(",") if item.strip()]


def _env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default

    normalized = value.strip().lower()
    if normalized in {"true", "1", "yes", "on"}:
        return True
    if normalized in {"false", "0", "no", "off"}:
        return False

    raise ValueError(
        f"{name} must be one of true, false, 1, 0, yes, no, on, or off.",
    )


def _env_int(name, default):
    value = _env_string(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer.") from exc


def _env_float(name, default):
    value = _env_string(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a number.") from exc


def _database_from_url(database_url):
    parsed = urlparse(database_url)
    if parsed.scheme.startswith("sqlite"):
        db_path = unquote(parsed.path.lstrip("/")) or str(BASE_DIR / "db.sqlite3")
        if parsed.netloc:
            db_path = f"{parsed.netloc}{parsed.path}"
        return {"ENGINE": "django.db.backends.sqlite3", "NAME": db_path}

    if parsed.scheme in {"postgres", "postgresql"}:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "localhost",
            "PORT": parsed.port or 5432,
        }

    raise ValueError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")


def _database_config():
    database_url = _env_string("DATABASE_URL")
    if database_url:
        return _database_from_url(database_url)

    db_name = _env_string("DB_NAME")
    if db_name:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_name,
            "USER": _env_string("DB_USER", "postgres"),
            "PASSWORD": _env_string("DB_PASSWORD", ""),
            "HOST": _env_string("DB_HOST", "localhost"),
            "PORT": _env_string("DB_PORT", "5432"),
        }

    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BASE_DIR / "db.sqlite3"),
    }


def get_ai_runtime_config():
    provider = (_env_string("AI_PROVIDER", "deterministic") or "deterministic").lower()
    if provider not in {"deterministic", "anthropic", "gemini"}:
        raise ValueError("AI_PROVIDER must be 'deterministic', 'anthropic', or 'gemini'.")

    return {
        "provider": provider,
        # Anthropic settings
        "api_key": _env_string("ANTHROPIC_API_KEY"),
        "model": _env_string("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        "timeout_seconds": _env_float("ANTHROPIC_TIMEOUT_SECONDS", 20.0),
        "max_tokens": _env_int("ANTHROPIC_MAX_TOKENS", 1400),
        # Gemini settings
        "gemini_api_key": _env_string("GEMINI_API_KEY"),
        "gemini_model": _env_string("GEMINI_MODEL", "gemini-2.0-flash"),
        "gemini_max_tokens": _env_int("GEMINI_MAX_TOKENS", 1400),
    }


SECRET_KEY = _env_string("SECRET_KEY", "insecure-dev-key-change-me")
DEBUG = _env_bool("DEBUG", True)

# Build ALLOWED_HOSTS from the env var, then also add the Render-injected
# RENDER_EXTERNAL_HOSTNAME (automatically set by Render for every web service).
_allowed_hosts = _env_csv("ALLOWED_HOSTS", "localhost,127.0.0.1")
_render_host = _env_string("RENDER_EXTERNAL_HOSTNAME")
if _render_host and _render_host not in _allowed_hosts:
    _allowed_hosts.append(_render_host)
ALLOWED_HOSTS = _allowed_hosts

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "core.apps.CoreConfig",
    "goals.apps.GoalsConfig",
    "finance.apps.FinanceConfig",
    "health.apps.HealthConfig",
    "schedule.apps.ScheduleConfig",
    "pipeline.apps.PipelineConfig",
    "analytics.apps.AnalyticsConfig",
    "journal.apps.JournalConfig",
    "contacts.apps.ContactsConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
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
DATABASES = {"default": _database_config()}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = _env_string("TIME_ZONE", "Africa/Cairo")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "config.pagination.FlexiblePageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
}

CORS_ALLOWED_ORIGINS = _env_csv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:5174,http://127.0.0.1:5174,"
    "http://localhost:5175,http://127.0.0.1:5175,"
    "http://localhost:5176,http://127.0.0.1:5176,"
    "http://localhost:5177,http://127.0.0.1:5177,"
    "http://localhost:5178,http://127.0.0.1:5178,"
    "http://localhost:5179,http://127.0.0.1:5179,"
    "http://localhost:5180,http://127.0.0.1:5180",
)
