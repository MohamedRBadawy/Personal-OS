"""Management command: import_data

Restores Personal OS data from a JSON backup file created by export_data.

Usage:
    python manage.py import_data --input backup_2026-04-08.json
    python manage.py import_data --input backup.json --clear

WARNING: --clear deletes all existing data before importing.
         Only use this on a fresh database or for a full restore.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = "Restore Personal OS data from a JSON backup file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--input",
            required=True,
            help="Path to the JSON backup file produced by export_data.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            default=False,
            help="Delete ALL existing data before importing. USE WITH CAUTION.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Parse and validate the file without writing anything.",
        )

    def handle(self, *args, **options):
        input_path = Path(options["input"])
        if not input_path.exists():
            raise CommandError(f"File not found: {input_path}")

        self.stdout.write(f"Reading backup from {input_path}...")
        try:
            payload = json.loads(input_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON: {exc}") from exc

        version = payload.get("version", "unknown")
        exported_at = payload.get("exported_at", "unknown")
        record_count = payload.get("record_count", 0)
        objects = payload.get("objects", [])

        self.stdout.write(f"  Backup version: {version}")
        self.stdout.write(f"  Exported at:    {exported_at}")
        self.stdout.write(f"  Records:        {record_count}")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS("Dry run complete — no data written."))
            return

        if options["clear"]:
            self.stdout.write(self.style.WARNING("--clear specified: deleting existing data..."))
            self._clear_data()

        self.stdout.write("Importing records...")
        self._import_objects(objects)

        self.stdout.write(self.style.SUCCESS(
            f"\nImport complete: {len(objects)} records restored."
        ))

    def _clear_data(self):
        """Delete all data from all export targets in reverse FK order."""
        from core.management.commands.export_data import EXPORT_TARGETS
        from django.apps import apps

        for model_label in reversed(EXPORT_TARGETS):
            try:
                app_label, model_name = model_label.split(".")
                model = apps.get_model(app_label, model_name)
                count, _ = model.objects.all().delete()
                self.stdout.write(f"  Deleted {count} {model_label} records")
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"  Could not clear {model_label}: {exc}")

    @transaction.atomic
    def _import_objects(self, objects):
        """Deserialize and save objects in FK-safe order."""
        from django.core import serializers

        # Re-serialize to the format Django's deserializer expects
        import json
        serialized = json.dumps(objects, default=str)

        count = 0
        errors = 0
        for obj in serializers.deserialize("json", serialized):
            try:
                obj.save()
                count += 1
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"  Could not save {obj}: {exc}")
                errors += 1

        self.stdout.write(f"  Saved {count} records ({errors} errors)")
