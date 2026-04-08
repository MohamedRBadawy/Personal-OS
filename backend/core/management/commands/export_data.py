"""Management command: export_data

Dumps all Personal OS data to a single JSON file that can be restored
with import_data.

Usage:
    python manage.py export_data
    python manage.py export_data --output backup_2026-04-08.json
"""
import json
import sys
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand
from django.core import serializers


# Apps and models to export, in dependency-safe order (FKs point backward)
EXPORT_TARGETS = [
    # Goals
    "goals.node",
    "goals.goalattachmentprofile",
    "goals.attachment",
    "goals.learningitem",
    # Finance
    "finance.financesummary",
    "finance.financeentry",
    "finance.incomesource",
    "finance.incomeevent",
    # Health
    "health.healthlog",
    "health.habitlog",
    "health.moodlog",
    "health.spirituallog",
    "health.habit",
    # Schedule / Routine
    "schedule.scheduletemplate",
    "schedule.scheduleblock",
    "schedule.schedulelog",
    "schedule.routineblock",
    "schedule.routinelog",
    # Pipeline
    "pipeline.client",
    "pipeline.opportunity",
    "pipeline.marketingaction",
    # Analytics
    "analytics.weeklyreview",
    "analytics.aisuggestion",
    # Journal
    "journal.journalentry",
]


class Command(BaseCommand):
    help = "Export all Personal OS data to a JSON backup file."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default=None,
            help="Path to output file. Defaults to backup_YYYY-MM-DD.json in current dir.",
        )
        parser.add_argument(
            "--pretty",
            action="store_true",
            default=True,
            help="Pretty-print the JSON output (default: True).",
        )

    def handle(self, *args, **options):
        output_path = options["output"]
        if not output_path:
            output_path = f"backup_{date.today().isoformat()}.json"

        output_file = Path(output_path)

        self.stdout.write(f"Exporting Personal OS data to {output_file}...")

        all_objects = []
        stats = {}

        for model_label in EXPORT_TARGETS:
            try:
                data = serializers.serialize("python", self._get_queryset(model_label))
                all_objects.extend(data)
                stats[model_label] = len(data)
                self.stdout.write(f"  OK {model_label}: {len(data)} records")
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"  ERROR {model_label}: {exc}")
                stats[model_label] = f"ERROR: {exc}"

        payload = {
            "version": "1.0",
            "exported_at": date.today().isoformat(),
            "record_count": len(all_objects),
            "objects": all_objects,
            "stats": stats,
        }

        indent = 2 if options["pretty"] else None
        output_file.write_text(json.dumps(payload, indent=indent, default=str), encoding="utf-8")

        total = len(all_objects)
        self.stdout.write(self.style.SUCCESS(
            f"\nExport complete: {total} records written to {output_file}"
        ))

    def _get_queryset(self, model_label):
        """Return the default queryset for a model label like 'goals.node'."""
        from django.apps import apps
        app_label, model_name = model_label.split(".")
        model = apps.get_model(app_label, model_name)
        return model.objects.all()
