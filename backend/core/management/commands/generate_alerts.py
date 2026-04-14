"""Management command: generate_alerts

Runs all AlertService checks, creates new alerts, resolves stale ones,
and pushes critical alerts via Telegram.

Usage:
    python manage.py generate_alerts
    python manage.py generate_alerts --verbosity 2   # debug output
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate smart alerts from cross-domain data checks."

    def handle(self, *args, **options):
        from core.alert_service import AlertService  # noqa: PLC0415

        verbosity = options.get("verbosity", 1)

        if verbosity >= 1:
            self.stdout.write("Running alert checks...")

        created = AlertService.generate()

        if verbosity >= 1:
            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created {len(created)} alert(s): "
                        + ", ".join(f"[{a.priority}] {a.title}" for a in created)
                    )
                )
            else:
                self.stdout.write("No new alerts.")
