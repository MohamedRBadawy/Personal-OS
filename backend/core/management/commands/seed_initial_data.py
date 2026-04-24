"""Seed the repo with Mohamed's baseline Personal OS context."""
from datetime import time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import AppSettings, Profile
from finance.models import FinanceEntry, FinanceSummary
from finance.services import FinanceMetricsService
from goals.models import Node
from goals.services import NodeStatusService
from health.models.habit import Habit
from pipeline.models import MarketingAction
from profile.models import UserProfile
from schedule.models import RoutineBlock, ScheduleBlock, ScheduleTemplate


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

        user_profile = UserProfile.get_or_create_singleton()
        user_profile.full_name = "Mohamed Badawy"
        user_profile.date_of_birth = "1988-06-01"
        user_profile.location = "Cairo, Egypt"
        user_profile.personality_type = "INTP"
        user_profile.religion = "Islam"
        user_profile.monthly_income = Decimal("700")
        user_profile.monthly_independent_income = Decimal("0")
        user_profile.financial_target_monthly = Decimal("1000")
        user_profile.financial_target_currency = "EUR"
        user_profile.income_currency = "EUR"
        user_profile.monthly_expenses = Decimal("0")
        user_profile.total_debt = Decimal("0")
        user_profile.debt_currency = "EGP"
        user_profile.north_star_label = "Independent income"
        user_profile.north_star_target_amount = Decimal("1000")
        user_profile.north_star_currency = "EUR"
        user_profile.north_star_unit = "per month"
        user_profile.save()

        income_goal, _ = Node.objects.update_or_create(
            code="g2",
            defaults={
                "title": "Reach EUR 1,000/month independent income",
                "type": Node.NodeType.GOAL,
                "category": Node.Category.FINANCE,
                "status": Node.Status.ACTIVE,
                "notes": "Blocked by: defined service plus first client.",
            },
        )
        kyrgyzstan_goal, _ = Node.objects.update_or_create(
            code="g1",
            defaults={
                "title": "Move family to Kyrgyzstan",
                "type": Node.NodeType.GOAL,
                "category": Node.Category.LIFE,
                "status": Node.Status.BLOCKED,
                "notes": "Blocked by: independent income >= EUR 1,000/month.",
            },
        )
        product_goal, _ = Node.objects.update_or_create(
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
            Node.objects.update_or_create(
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
            (
                "t1",
                "Draft the operational systems service outline",
                "p1",
                Node.Status.AVAILABLE,
                1,
                Node.ManualPriority.HIGH,
                Node.Effort.H_1,
                today,
            ),
            (
                "t2",
                "Refresh LinkedIn headline and proof",
                "p2",
                Node.Status.AVAILABLE,
                1,
                Node.ManualPriority.HIGH,
                Node.Effort.MIN_30,
                today,
            ),
            (
                "t3",
                "Write the diagnostic methodology one-pager",
                "p3",
                Node.Status.ACTIVE,
                2,
                Node.ManualPriority.MEDIUM,
                Node.Effort.H_1,
                today + timezone.timedelta(days=1),
            ),
            (
                "t4",
                "Ship the schedule loop for Personal OS",
                "p4",
                Node.Status.ACTIVE,
                2,
                Node.ManualPriority.MEDIUM,
                Node.Effort.H_2,
                today + timezone.timedelta(days=2),
            ),
        ]
        for code, title, parent_code, status_value, priority, manual_priority, effort, target_date in task_defaults:
            parent = Node.objects.get(code=parent_code)
            Node.objects.update_or_create(
                code=code,
                defaults={
                    "title": title,
                    "type": Node.NodeType.TASK,
                    "category": Node.Category.CAREER,
                    "status": status_value,
                    "parent": parent,
                    "priority": priority,
                    "manual_priority": manual_priority,
                    "effort": effort,
                    "target_date": target_date,
                    "focus_date": today if priority == 1 else None,
                },
            )

        burden_defaults = [
            ("b1", "Single income source - K Line Europe (EUR 700/month)"),
            ("b2", "No financial buffer or surplus"),
        ]
        for code, title in burden_defaults:
            Node.objects.update_or_create(
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

        finance_summary = FinanceSummary.get()
        finance_summary.income_eur = Decimal("700")
        finance_summary.income_sources_text = settings_obj.employment_income_source_name
        finance_summary.independent_monthly = Decimal("0")
        finance_summary.target_independent = Decimal(str(settings_obj.independent_income_target_eur))
        finance_summary.income_egp_direct = Decimal("0")
        finance_summary.monthly_expenses_egp = Decimal("0")
        finance_summary.exchange_rate = Decimal(str(settings_obj.eur_to_egp_rate))
        finance_summary.notes = "Seeded baseline finance summary for the redesigned dashboard."
        finance_summary.save()

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

        routine_block_defaults = [
            ("05:00", "Fajr prayer (mosque)", RoutineBlock.BlockType.SPIRITUAL, True, 15, 1, "must", income_goal),
            ("05:20", "Quran (1 juz) + adhkar", RoutineBlock.BlockType.SPIRITUAL, True, 20, 2, "must", None),
            ("06:00", "Exercise", RoutineBlock.BlockType.HEALTH, True, 45, 3, "should", None),
            ("07:00", "Cold shower + prep", RoutineBlock.BlockType.HEALTH, True, 30, 4, "should", None),
            ("07:30", "Breakfast (low carb)", RoutineBlock.BlockType.PERSONAL, True, 30, 5, "should", None),
            ("08:00", "Deep work - K Line", RoutineBlock.BlockType.WORK, False, 90, 6, "must", None),
            ("09:30", "Dhuhr prayer (mosque)", RoutineBlock.BlockType.SPIRITUAL, True, 15, 7, "must", None),
            ("09:45", "Deep work - service biz", RoutineBlock.BlockType.WORK, False, 90, 8, "must", income_goal),
            ("11:15", "Email / communications", RoutineBlock.BlockType.WORK, False, 30, 9, "should", None),
            ("12:00", "Lunch + rest", RoutineBlock.BlockType.PERSONAL, True, 60, 10, "should", None),
            ("13:00", "Asr prayer (mosque)", RoutineBlock.BlockType.SPIRITUAL, True, 15, 11, "must", None),
            ("13:15", "Outreach / marketing", RoutineBlock.BlockType.WORK, False, 45, 12, "must", income_goal),
            ("14:00", "Learning block", RoutineBlock.BlockType.PERSONAL, False, 45, 13, "nice", None),
            ("15:00", "Admin / Life OS review", RoutineBlock.BlockType.WORK, False, 30, 14, "should", None),
            ("15:30", "Maghrib prayer (mosque)", RoutineBlock.BlockType.SPIRITUAL, True, 15, 15, "must", None),
            ("17:00", "Family time (2 hrs)", RoutineBlock.BlockType.FAMILY, True, 120, 16, "must", None),
            ("19:00", "Isha prayer + adhkar", RoutineBlock.BlockType.SPIRITUAL, True, 15, 17, "must", None),
            ("19:30", "Quran memorization + kids", RoutineBlock.BlockType.SPIRITUAL, False, 60, 18, "should", None),
            ("20:30", "Reading", RoutineBlock.BlockType.PERSONAL, False, 30, 19, "nice", None),
            ("22:00", "Sleep", RoutineBlock.BlockType.HEALTH, True, 480, 20, "must", None),
        ]
        for time_value, label, block_type, is_fixed, duration_minutes, order, importance, linked_node in routine_block_defaults:
            RoutineBlock.objects.update_or_create(
                time=time.fromisoformat(time_value),
                label=label,
                defaults={
                    "type": block_type,
                    "duration_minutes": duration_minutes,
                    "is_fixed": is_fixed,
                    "order": order,
                    "active": True,
                    "importance": importance,
                    "linked_node": linked_node,
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
