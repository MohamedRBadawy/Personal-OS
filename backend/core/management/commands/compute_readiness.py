"""Compute and store today's Kyrgyzstan Readiness Score."""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Compute and store today's Kyrgyzstan Readiness Score snapshot."

    # Maximum baseline debt used to calculate debt payoff progress (EGP)
    DEBT_BASELINE_EGP = Decimal("33150")

    def handle(self, *args, **options):
        from core.models import ReadinessSnapshot  # noqa: PLC0415

        today = timezone.localdate()

        snapshot, created = ReadinessSnapshot.objects.get_or_create(date=today)
        scores, raw = self._compute()

        snapshot.income_score    = scores["income"]
        snapshot.debt_score      = scores["debt"]
        snapshot.pipeline_score  = scores["pipeline"]
        snapshot.routine_score   = scores["routine"]
        snapshot.spiritual_score = scores["spiritual"]
        snapshot.savings_score   = scores["savings"]
        snapshot.family_score    = scores["family"]
        snapshot.total_score     = sum(scores.values())
        snapshot.snapshot_data   = raw
        snapshot.save()

        verb = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} readiness snapshot for {today}: {snapshot.total_score}/100"
            )
        )

    def _compute(self):
        scores = {}
        raw = {}

        # ── 1. Independent income score (max 40) ─────────────────────────────
        try:
            from finance.models import FinanceSummary  # noqa: PLC0415
            fs = FinanceSummary.objects.order_by("created_at").first()
            if fs:
                independent = fs.independent_monthly or Decimal("0")
                target = fs.target_independent or Decimal("1000")
                income_ratio = min(float(independent / target), 1.0) if target > 0 else 0.0
                scores["income"] = round(income_ratio * 40, 2)
                raw["independent_monthly_eur"] = float(independent)
                raw["target_eur"] = float(target)
                raw["income_ratio_pct"] = round(income_ratio * 100, 1)

                # Debt score from FinanceSummary.debts JSON
                debts = fs.debts or []
                if isinstance(debts, list):
                    total_debt = sum(Decimal(str(d.get("amount_egp", 0))) for d in debts)
                else:
                    total_debt = Decimal("0")

                if self.DEBT_BASELINE_EGP > 0:
                    paid_ratio = max(0.0, float(1 - total_debt / self.DEBT_BASELINE_EGP))
                else:
                    paid_ratio = 1.0 if total_debt == 0 else 0.0

                scores["debt"] = round(min(paid_ratio, 1.0) * 15, 2)
                raw["total_debt_egp"] = float(total_debt)
                raw["debt_paid_pct"] = round(paid_ratio * 100, 1)

                # Savings score (max 10)
                savings_current = fs.savings_current_egp or Decimal("0")
                monthly_expenses = fs.monthly_expenses_egp or Decimal("1")
                savings_target = monthly_expenses * 3  # 3-month buffer
                savings_ratio = float(savings_current / savings_target) if savings_target > 0 else 0.0
                scores["savings"] = round(min(savings_ratio, 1.0) * 10, 2)
                raw["savings_current_egp"] = float(savings_current)
                raw["savings_target_egp"] = float(savings_target)
            else:
                scores["income"] = 0
                scores["debt"] = 0
                scores["savings"] = 0
        except Exception:  # noqa: BLE001
            scores["income"] = 0
            scores["debt"] = 0
            scores["savings"] = 0

        # ── 2. Pipeline score (max 10) ────────────────────────────────────────
        try:
            from pipeline.models import Opportunity  # noqa: PLC0415
            active_opps = Opportunity.objects.filter(
                status__in=["contacted", "pitched", "proposal_sent", "negotiating"]
            ).count()
            raw["active_opportunities"] = active_opps
            # 1 opp = 4pts, 2 = 7pts, 3+ = 10pts
            pipeline_pts = min(active_opps * 3.5, 10)
            scores["pipeline"] = round(pipeline_pts, 2)
        except Exception:  # noqa: BLE001
            scores["pipeline"] = 0

        # ── 3. Routine streak score (max 10) ─────────────────────────────────
        try:
            from schedule.models import RoutineLog  # noqa: PLC0415
            # Count consecutive days (going back from yesterday) with ≥50% blocks done
            from django.utils import timezone as tz  # noqa: PLC0415
            today = tz.localdate()
            streak = 0
            for days_back in range(1, 31):  # check last 30 days
                check_date = today - __import__("datetime").timedelta(days=days_back)
                logs = RoutineLog.objects.filter(date=check_date)
                done = logs.filter(status__in=["done", "partial"]).count()
                total = logs.count()
                if total > 0 and done / total >= 0.5:
                    streak += 1
                elif total == 0:
                    break
                else:
                    break
            raw["routine_streak_days"] = streak
            scores["routine"] = round(min(streak / 14, 1.0) * 10, 2)  # max at 14-day streak
        except Exception:  # noqa: BLE001
            scores["routine"] = 0

        # ── 4. Spiritual score (max 10) ───────────────────────────────────────
        try:
            from health.models.spiritual import SpiritualLog  # noqa: PLC0415
            from django.utils import timezone as tz  # noqa: PLC0415
            import datetime  # noqa: PLC0415
            cutoff = tz.localdate() - datetime.timedelta(days=30)
            logs = SpiritualLog.objects.filter(date__gte=cutoff)
            total_days = logs.count()
            if total_days > 0:
                # Count days with all 5 prayers
                full_prayer_days = sum(
                    1 for log in logs
                    if all([log.fajr, log.dhuhr, log.asr, log.maghrib, log.isha])
                )
                prayer_rate = full_prayer_days / 30
            else:
                prayer_rate = 0.0
            scores["spiritual"] = round(min(prayer_rate, 1.0) * 10, 2)
            raw["full_prayer_days_30d"] = full_prayer_days if total_days > 0 else 0
            raw["prayer_rate_pct"] = round(prayer_rate * 100, 1)
        except Exception:  # noqa: BLE001
            scores["spiritual"] = 0

        # ── 5. Family goals score (max 5) ─────────────────────────────────────
        try:
            from analytics.models import FamilyGoal  # noqa: PLC0415
            all_goals = FamilyGoal.objects.all()
            total_goals = all_goals.count()
            if total_goals > 0:
                done_goals = all_goals.filter(status="done").count()
                family_ratio = done_goals / total_goals
            else:
                family_ratio = 0.5  # neutral — no goals means uncertain
            scores["family"] = round(min(family_ratio, 1.0) * 5, 2)
            raw["family_goals_done"] = done_goals if total_goals > 0 else 0
            raw["family_goals_total"] = total_goals
        except Exception:  # noqa: BLE001
            scores["family"] = 0

        return scores, raw
