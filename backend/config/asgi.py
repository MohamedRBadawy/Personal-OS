"""ASGI config for Personal Life OS.

Exposes the ASGI callable as a module-level variable named ``application``.
Used for async-capable deployments.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_asgi_application()
