"""Seed the repo with Mohamed's baseline Personal OS context."""
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import AppSettings, Profile
from finance.models import FinanceEntry
from finance.services import FinanceMetricsService
from goals.models import Node
from goals.services import NodeStatusService
from health.models.habit import Habit
from pipeline.models import MarketingAction
from schedule.models import ScheduleBlock, ScheduleTemplate


class Command(BaseCommand):
    """Load Mohamed's baseline profile, goals, projects, burdens, and finance."""

    help = "Seed Mohamed's initial Personal OS context."

    def handle(self, *args, **options):
        today = timezone.localdate()
        month_start = today.replace(day=1)

        settings_obj = AppSettings.get_solo()

        Profile.objects.get_or_create(
            full_name="Mohamed Badawy",
            defaults={
                "birth_date": "1988-06-01",
                "location": "Cairo, Egypt",
                "timezone": "Africa/Cairo",
                "background": (
                    "Founder (Expack), Freelancer (Sandton), "
                    "Operational Systems Lead (K Line Europe)."
                ),
                "cognitive_style": (
                    "Problem-first, structural thinker, diagnoses at depth, "
                    "commits to solutions quickly."
                ),
                "family_context": "Married with children.",
                "life_focus": "Reach independent income and move the family to Kyrgyzstan.",
            },
        )

        income_goal, _ = Node.objects.get_or_create(
            code="g2",
            defaults={
                "title": "Reach EUR 1,000/month independent income",
                "type": Node.NodeType.GOAL,
                "category": Node.Category.FINANCE,
                "status": Node.Status.ACTIVE,
                "notes": "Blocked by: defined service plus first client.",
            },
        )
        kyrgyzstan_goal, _ = Node.objects.get_or_create(
            code="g1",
            defaults={
                "title": "Move family to Kyrgyzstan",
                "type": Node.NodeType.GOAL,
                "category": Node.Category.LIFE,
                "status": Node.Status.BLOCKED,
                "notes": "Blocked by: independent income >= EUR 1,000/month.",
            },
        )
        product_goal, _ = Node.objects.get_or_create(
            code="g3",
            defaults={
                "title": "Build a product business",
                "type": Node.NodeType.GOAL,
                "category": Node.Category.CAREER,
                "status": Node.Status.BLOCKED,
                "notes": "Blocked by: stable service income.",
            },
        )

        kyrgyzstan_goal.deps.set([income_goal])
        product_goal.deps.set([income_goal])

        project_defaults = [
            ("p1", "Define and sell operational systems service", income_goal),
            ("p2", "Rewrite portfolio and LinkedIn", income_goal),
            ("p3", "Formalize diagnostic methodology", income_goal),
            ("p4", "Build Personal Life OS", product_goal),
        ]
        for code, title, parent in project_defaults:
            Node.objects.get_or_create(
                code=code,
                defaults={
                    "title": title,
                    "type": Node.NodeType.PROJECT,
                    "category": Node.Category.CAREER,
                    "status": Node.Status.ACTIVE,
                    "parent": parent,
                },
            )

        task_defaults = [
            ("t1", "Draft the operational systems service outline", "p1"),
            ("t2", "Refresh LinkedIn headline and proof", "p2"),
            ("t3", "Write the diagnostic methodology one-pager", "p3"),
            ("t4", "Ship the schedule loop for Personal OS", "p4"),
        ]
        for code, title, parent_code in task_defaults:
            parent = Node.objects.get(code=parent_code)
            Node.objects.get_or_create(
                code=code,
                defaults={
                    "title": title,
                    "type": Node.NodeType.TASK,
                    "category": Node.Category.CAREER,
                    "status": Node.Status.ACTIVE,
                    "parent": parent,
                },
            )

        burden_defaults = [
            ("b1", "Single income source - K Line Europe (EUR 700/month)"),
            ("b2", "No financial buffer or surplus"),
        ]
        for code, title in burden_defaults:
            Node.objects.get_or_create(
                code=code,
                defaults={
                    "title": title,
                    "type": Node.NodeType.BURDEN,
                    "category": Node.Category.FINANCE,
                    "status": Node.Status.ACTIVE,
                },
            )

        FinanceEntry.objects.get_or_create(
            type=FinanceEntry.EntryType.INCOME,
            source=settings_obj.employment_income_source_name,
            date=month_start,
            defaults={
                "amount": 700,
                "currency": FinanceEntry.Currency.EUR,
                "is_independent": False,
                "is_recurring": True,
                "notes": "Seeded baseline employment income.",
            },
        )

        template, _ = ScheduleTemplate.objects.get_or_create(
            name="Core Day",
            defaults={"is_active": True},
        )
        if not template.is_active:
            template.is_active = True
            template.save(update_fields=["is_active"])
        ScheduleTemplate.objects.exclude(pk=template.pk).update(is_active=False)

        block_defaults = [
            ("05:00", "Fajr and morning anchor", ScheduleBlock.BlockType.SPIRITUAL, True, 30, False, 10),
            ("07:00", "Walk and body check", ScheduleBlock.BlockType.HEALTH, True, 30, False, 20),
            ("09:00", "Focused work slot", ScheduleBlock.BlockType.WORK, False, 90, True, 30),
            ("13:00", "Marketing follow-up slot", ScheduleBlock.BlockType.MARKETING, False, 45, True, 40),
            ("18:00", "Family anchor", ScheduleBlock.BlockType.FAMILY, True, 90, False, 50),
        ]
        for time_value, label, block_type, is_fixed, duration_mins, is_adjustable, sort_order in block_defaults:
            ScheduleBlock.objects.get_or_create(
                template=template,
                time=time_value,
                label=label,
                defaults={
                    "type": block_type,
                    "is_fixed": is_fixed,
                    "duration_mins": duration_mins,
                    "is_adjustable": is_adjustable,
                    "sort_order": sort_order,
                },
            )

        MarketingAction.objects.get_or_create(
            action="Follow up with warm LinkedIn lead",
            platform="LinkedIn",
            date=today - timezone.timedelta(days=2),
            defaults={
                "goal": income_goal,
                "result": "Waiting for a reply.",
                "follow_up_date": today,
                "follow_up_done": False,
            },
        )

        habit_defaults = [
            ("Cold shower", Habit.Target.DAILY, None, None),
            ("Reading session", Habit.Target.DAILY, None, None),
            ("LinkedIn outreach", Habit.Target.THREE_X_WEEK, None, income_goal),
        ]
        for name, target, custom_days, goal in habit_defaults:
            Habit.objects.get_or_create(
                name=name,
                defaults={
                    "target": target,
                    "custom_days": custom_days,
                    "goal": goal,
                },
            )

        NodeStatusService.refresh_all()
        FinanceMetricsService.sync_goal_status()
        self.stdout.write(self.style.SUCCESS("Initial Personal OS data seeded successfully."))
