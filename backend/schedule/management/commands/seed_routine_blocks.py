"""Management command: seed_routine_blocks

Populates the RoutineBlock table from the canonical 20-block daily schedule.
Idempotent — skips if any blocks already exist.

Usage:
    python manage.py seed_routine_blocks
"""
from django.core.management.base import BaseCommand

from schedule.models import RoutineBlock

BLOCKS = [
    {"time": "05:00", "label": "Fajr prayer (mosque)", "type": "spiritual", "is_fixed": True, "duration_minutes": 15, "order": 1},
    {"time": "05:20", "label": "Quran (1 juz) + adhkar", "type": "spiritual", "is_fixed": True, "duration_minutes": 20, "order": 2},
    {"time": "06:00", "label": "Exercise", "type": "health", "is_fixed": True, "duration_minutes": 45, "order": 3},
    {"time": "07:00", "label": "Cold shower + prep", "type": "health", "is_fixed": True, "duration_minutes": 30, "order": 4},
    {"time": "07:30", "label": "Breakfast (low carb)", "type": "personal", "is_fixed": True, "duration_minutes": 30, "order": 5},
    {"time": "08:00", "label": "Deep work — K Line", "type": "work", "is_fixed": False, "duration_minutes": 90, "order": 6},
    {"time": "09:30", "label": "Dhuhr prayer (mosque)", "type": "spiritual", "is_fixed": True, "duration_minutes": 15, "order": 7},
    {"time": "09:45", "label": "Deep work — service biz", "type": "work", "is_fixed": False, "duration_minutes": 90, "order": 8},
    {"time": "11:15", "label": "Email / communications", "type": "work", "is_fixed": False, "duration_minutes": 30, "order": 9},
    {"time": "12:00", "label": "Lunch + rest", "type": "personal", "is_fixed": True, "duration_minutes": 60, "order": 10},
    {"time": "13:00", "label": "Asr prayer (mosque)", "type": "spiritual", "is_fixed": True, "duration_minutes": 15, "order": 11},
    {"time": "13:15", "label": "Outreach / marketing", "type": "work", "is_fixed": False, "duration_minutes": 45, "order": 12},
    {"time": "14:00", "label": "Learning block", "type": "personal", "is_fixed": False, "duration_minutes": 45, "order": 13},
    {"time": "15:00", "label": "Admin / Life OS review", "type": "work", "is_fixed": False, "duration_minutes": 30, "order": 14},
    {"time": "15:30", "label": "Maghrib prayer (mosque)", "type": "spiritual", "is_fixed": True, "duration_minutes": 15, "order": 15},
    {"time": "17:00", "label": "Family time (2 hrs)", "type": "family", "is_fixed": True, "duration_minutes": 120, "order": 16},
    {"time": "19:00", "label": "Isha prayer + adhkar", "type": "spiritual", "is_fixed": True, "duration_minutes": 15, "order": 17},
    {"time": "19:30", "label": "Quran memorization + kids", "type": "spiritual", "is_fixed": False, "duration_minutes": 60, "order": 18},
    {"time": "20:30", "label": "Reading", "type": "personal", "is_fixed": False, "duration_minutes": 30, "order": 19},
    {"time": "22:00", "label": "Sleep", "type": "health", "is_fixed": True, "duration_minutes": 480, "order": 20},
]


class Command(BaseCommand):
    help = "Seed RoutineBlock table from the canonical 20-block daily schedule."

    def handle(self, *args, **options):
        if RoutineBlock.objects.exists():
            self.stdout.write(self.style.WARNING(
                f"RoutineBlock table already has {RoutineBlock.objects.count()} rows — skipping seed."
            ))
            return

        created = RoutineBlock.objects.bulk_create([
            RoutineBlock(**b) for b in BLOCKS
        ])
        self.stdout.write(self.style.SUCCESS(
            f"[OK] Seeded {len(created)} routine blocks."
        ))
