"""WSGI config for Personal Life OS.

Exposes the WSGI callable as a module-level variable named ``application``.
Used by production WSGI servers (gunicorn, uWSGI, etc.).
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()
