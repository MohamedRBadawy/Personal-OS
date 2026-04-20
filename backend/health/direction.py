"""Whole-person health direction scoring and insights."""
import datetime
from collections import defaultdict

from django.db.models import Avg, Sum
from django.utils import timezone

from health.models import (
    Habit,
    HabitLog,
    HealthGoalProfile,
    HealthLog,
    MealLog,
    MealPlan,
    MoodLog,
    SpiritualLog,
)


class HealthDirectionService:
    """Computes a shared read model across body, mood, habits, spiritual, and meals."""

    BASE_WEIGHTS = {
        "recovery": 25,
        "performance_body": 20,
        "nutrition": 15,
        "mood": 15,
        "habits": 15,
        "spiritual": 10,
    }

    GOAL_PILLAR_MAP = {
        HealthGoalProfile.Goal.SLEEP_ENERGY: "recovery",
        HealthGoalProfile.Goal.STRENGTH: "performance_body",
        HealthGoalProfile.Goal.BODY_COMPOSITION: "performance_body",
        HealthGoalProfile.Goal.NUTRITION: "nutrition",
        HealthGoalProfile.Goal.MOOD_STABILITY: "mood",
        HealthGoalProfile.Goal.CONSISTENCY: "habits",
        HealthGoalProfile.Goal.SPIRITUAL_CONSISTENCY: "spiritual",
    }

    PILLAR_LABELS = {
        "recovery": "Recovery",
        "performance_body": "Performance",
        "nutrition": "Nutrition",
        "mood": "Mood",
        "habits": "Habits",
        "spiritual": "Spiritual",
    }

    @classmethod
    def goals_payload(cls):
        from health.serializers import HealthGoalProfileSerializer

        profile = HealthGoalProfile.get_solo()
        return HealthGoalProfileSerializer(profile).data

    @classmethod
    def payload(cls, reference_date=None):
        reference_date = reference_date or timezone.localdate()
        goals = HealthGoalProfile.get_solo()
        weights = cls._normalized_weights(goals)
        current_end = reference_date
        current_start = current_end - datetime.timedelta(days=13)
        previous_end = current_start - datetime.timedelta(days=1)
        previous_start = previous_end - datetime.timedelta(days=13)

        pillars = []
        current_scores = {}
        previous_scores = {}
        for pillar_id in cls.BASE_WEIGHTS:
            current = cls._pillar_payload(
                pillar_id,
                goals=goals,
                start=current_start,
                end=current_end,
                reference_date=reference_date,
                include_live=end_equals(current_end, reference_date),
            )
            previous = cls._pillar_payload(
                pillar_id,
                goals=goals,
                start=previous_start,
                end=previous_end,
                reference_date=previous_end,
                include_live=False,
            )
            delta = round(current["score"] - previous["score"], 1)
            current["trend"] = cls._trend_from_delta(delta)
            current["delta"] = delta
            current["weight"] = round(weights[pillar_id], 1)
            current["weighted_score"] = round(current["score"] * (weights[pillar_id] / 100), 1)
            pillars.append(current)
            current_scores[pillar_id] = current["score"]
            previous_scores[pillar_id] = previous["score"]

        overall_score = round(
            sum(current_scores[key] * (weights[key] / 100) for key in current_scores),
            1,
        )
        previous_overall = round(
            sum(previous_scores[key] * (weights[key] / 100) for key in previous_scores),
            1,
        )
        overall_delta = round(overall_score - previous_overall, 1)
        trend = cls._trend_from_delta(overall_delta)
        confidence = round(sum(p["confidence"] for p in pillars) / max(len(pillars), 1), 1)
        strengths, watchouts = cls._top_strengths_and_watchouts(pillars)
        next_actions = [p["recommended_action"] for p in pillars if p["score"] < 70][:3]
        cross_domain = cls._cross_domain_insights(pillars)
        headline = cls._headline(
            overall_score=overall_score,
            trend=trend,
            strengths=strengths,
            watchouts=watchouts,
        )

        return {
            "overall_score": overall_score,
            "trend": trend,
            "status": cls._status_from_score(overall_score),
            "confidence": confidence,
            "headline": headline,
            "strengths": strengths,
            "watchouts": watchouts,
            "next_actions": next_actions,
            "pillars": pillars,
            "cross_domain_insights": cross_domain,
            "score_delta": overall_delta,
            "window": {
                "current_start": current_start.isoformat(),
                "current_end": current_end.isoformat(),
                "previous_start": previous_start.isoformat(),
                "previous_end": previous_end.isoformat(),
            },
        }

    @classmethod
    def _normalized_weights(cls, goals):
        weights = dict(cls.BASE_WEIGHTS)
        for goal in dict.fromkeys(goals.primary_goals or []):
            pillar = cls.GOAL_PILLAR_MAP.get(goal)
            if pillar:
                weights[pillar] += 10
        total = sum(weights.values()) or 100
        return {key: (value / total) * 100 for key, value in weights.items()}

    @classmethod
    def _pillar_payload(cls, pillar_id, *, goals, start, end, reference_date, include_live):
        payload = getattr(cls, f"_build_{pillar_id}_pillar")(
            goals=goals,
            start=start,
            end=end,
            reference_date=reference_date,
            include_live=include_live,
        )
        payload["id"] = pillar_id
        payload["label"] = cls.PILLAR_LABELS[pillar_id]
        payload["status"] = cls._status_from_score(payload["score"])
        return payload

    @classmethod
    def _build_recovery_pillar(cls, *, goals, start, end, reference_date, include_live):
        logs = HealthLog.objects.filter(date__range=(start, end))
        avg_sleep = cls._avg_decimal(logs, "sleep_hours")
        avg_energy = cls._avg_decimal(logs, "energy_level")
        avg_quality = cls._avg_decimal(logs, "sleep_quality")
        low_sleep_days = logs.filter(sleep_hours__lt=6).count()

        sleep_score = cls._ratio_score(avg_sleep, float(goals.sleep_hours_target)) if avg_sleep is not None else 55
        energy_score = cls._scale_score(avg_energy, 5) if avg_energy is not None else 55
        quality_score = cls._scale_score(avg_quality, 5) if avg_quality is not None else 55

        readiness_score = None
        if include_live:
            from health.analytics import ExerciseAnalyticsService

            readiness = ExerciseAnalyticsService.readiness_today(reference_date)
            readiness_score = readiness.get("score")

        score = round(
            (sleep_score * 0.42)
            + (energy_score * 0.28)
            + (quality_score * 0.18)
            + ((readiness_score if readiness_score is not None else 60) * 0.12),
            1,
        )
        drivers = []
        if avg_sleep is not None:
            if avg_sleep >= float(goals.sleep_hours_target):
                drivers.append(f"Sleep average is meeting your {goals.sleep_hours_target}h target.")
            else:
                drivers.append(f"Sleep average is {avg_sleep:.1f}h vs target {goals.sleep_hours_target}h.")
        if avg_energy is not None:
            drivers.append(f"Energy is averaging {avg_energy:.1f}/5 across the last 14 days.")
        if low_sleep_days:
            drivers.append(f"{low_sleep_days} low-sleep day{'s' if low_sleep_days != 1 else ''} in this window.")
        if include_live and readiness_score is not None:
            drivers.append(f"Today’s readiness score is {readiness_score}/100.")

        recommended_action = (
            "Protect sleep quality before adding more load."
            if avg_sleep is None or avg_sleep < float(goals.sleep_hours_target)
            else "Keep recovery stable and avoid unnecessary late-night drift."
        )
        confidence = cls._confidence([avg_sleep, avg_energy, avg_quality, readiness_score if include_live else 60])
        return {
            "score": score,
            "confidence": confidence,
            "drivers": drivers[:4],
            "recommended_action": recommended_action,
            "details": {
                "avg_sleep_hours": avg_sleep,
                "target_sleep_hours": float(goals.sleep_hours_target),
                "avg_energy": avg_energy,
                "avg_sleep_quality": avg_quality,
                "low_sleep_days": low_sleep_days,
                "readiness_score": readiness_score,
            },
        }

    @classmethod
    def _build_performance_body_pillar(cls, *, goals, start, end, reference_date, include_live):
        from health.analytics import ExerciseAnalyticsService
        from health.models import SetLog, WorkoutSession

        sessions = WorkoutSession.objects.filter(date__range=(start, end))
        session_count = sessions.count()
        target_sessions = max(goals.weekly_workouts_target * 2, 1)
        session_score = cls._ratio_score(session_count, target_sessions)

        set_qs = SetLog.objects.filter(
            exercise__session__date__range=(start, end),
            weight_kg__isnull=False,
            reps__isnull=False,
        )
        volume = sum(float(item.weight_kg) * (item.reps or 0) for item in set_qs)
        previous_start = start - datetime.timedelta(days=14)
        previous_end = start - datetime.timedelta(days=1)
        previous_qs = SetLog.objects.filter(
            exercise__session__date__range=(previous_start, previous_end),
            weight_kg__isnull=False,
            reps__isnull=False,
        )
        previous_volume = sum(float(item.weight_kg) * (item.reps or 0) for item in previous_qs)
        strength_score = cls._volume_trend_score(volume, previous_volume)

        body_comp = ExerciseAnalyticsService.body_composition_trend(days=90)
        comp_score = cls._body_goal_score(
            body_goal=goals.body_goal,
            fat_trend=body_comp.get("fat_trend"),
            muscle_trend=body_comp.get("muscle_trend"),
        )

        score = round((session_score * 0.52) + (strength_score * 0.2) + (comp_score * 0.28), 1)
        drivers = [
            f"{session_count} workout session{'s' if session_count != 1 else ''} logged in the last 14 days.",
            f"Training target for this window is {target_sessions} sessions.",
        ]
        if volume > 0:
            drivers.append(f"Logged training volume is {volume:.0f} kg across tracked sets.")
        if body_comp.get("fat_trend") != "insufficient_data" or body_comp.get("muscle_trend") != "insufficient_data":
            drivers.append(
                f"Body composition trend: fat {body_comp.get('fat_trend')}, muscle {body_comp.get('muscle_trend')}."
            )

        recommended_action = (
            "Make your weekly workout rhythm more consistent."
            if session_count < target_sessions
            else "Keep building progressive overload without sacrificing recovery."
        )
        confidence = cls._confidence([
            session_count if session_count else None,
            volume if volume else None,
            body_comp.get("latest"),
        ])
        return {
            "score": score,
            "confidence": confidence,
            "drivers": drivers[:4],
            "recommended_action": recommended_action,
            "details": {
                "session_count": session_count,
                "target_sessions": target_sessions,
                "total_volume_kg": round(volume, 1),
                "previous_volume_kg": round(previous_volume, 1),
                "fat_trend": body_comp.get("fat_trend"),
                "muscle_trend": body_comp.get("muscle_trend"),
                "body_goal": goals.body_goal,
            },
        }

    @classmethod
    def _build_nutrition_pillar(cls, *, goals, start, end, reference_date, include_live):
        plans = MealPlan.objects.filter(date__range=(start, end)).prefetch_related("log")
        plan_count = plans.count()
        logged_count = 0
        as_planned_count = 0
        daily_protein = defaultdict(float)
        active_days = set()

        for plan in plans:
            active_days.add(plan.date)
            daily_protein[plan.date] += float(plan.protein_g or 0)
            if hasattr(plan, 'log'):
                logged_count += 1
                if plan.log.status == MealLog.EatStatus.AS_PLANNED:
                    as_planned_count += 1

        day_span = max((end - start).days + 1, 1)
        avg_daily_protein = round(sum(daily_protein.values()) / day_span, 1) if daily_protein else 0.0
        protein_score = cls._ratio_score(avg_daily_protein, goals.protein_g_target)
        adherence_pct = cls._percentage(as_planned_count, plan_count) if plan_count else None
        adherence_score = adherence_pct if adherence_pct is not None else 55
        consistency_pct = round((len(active_days) / day_span) * 100, 1) if day_span else 0.0
        score = round((protein_score * 0.46) + (adherence_score * 0.34) + (consistency_pct * 0.2), 1)

        drivers = []
        drivers.append(
            f"Average daily protein is {avg_daily_protein:.1f}g vs target {goals.protein_g_target}g."
        )
        if adherence_pct is not None:
            drivers.append(f"Meal adherence is {adherence_pct:.1f}% across planned meals.")
        else:
            drivers.append("Meal adherence is not available yet because meals have not been logged.")
        drivers.append(f"Meals were planned on {len(active_days)}/{day_span} days in this window.")

        recommended_action = (
            "Raise protein consistency and log meals more reliably."
            if protein_score < 70 or (adherence_pct is not None and adherence_pct < 70)
            else "Keep nutrition steady so it continues supporting recovery and performance."
        )
        confidence = cls._confidence([
            avg_daily_protein if avg_daily_protein else None,
            adherence_pct,
            len(active_days) if active_days else None,
        ])
        return {
            "score": score,
            "confidence": confidence,
            "drivers": drivers[:4],
            "recommended_action": recommended_action,
            "details": {
                "avg_daily_protein_g": avg_daily_protein,
                "target_protein_g": goals.protein_g_target,
                "meal_adherence_pct": adherence_pct,
                "meal_consistency_pct": consistency_pct,
                "planned_meals": plan_count,
                "logged_meals": logged_count,
                "active_days": len(active_days),
            },
        }

    @classmethod
    def _build_mood_pillar(cls, *, goals, start, end, reference_date, include_live):
        logs = MoodLog.objects.filter(date__range=(start, end))
        avg_mood = cls._avg_decimal(logs, "mood_score")
        avg_30d = cls._avg_decimal(
            MoodLog.objects.filter(
                date__range=(end - datetime.timedelta(days=29), end),
            ),
            "mood_score",
        )
        streak = cls._low_mood_streak(reference_date)
        score = round((cls._scale_score(avg_mood, 5) if avg_mood is not None else 55) - min(streak * 8, 30), 1)
        score = max(0, score)
        drivers = []
        if avg_mood is not None:
            drivers.append(f"Mood is averaging {avg_mood:.1f}/5 in the current window.")
        if avg_30d is not None:
            drivers.append(f"30-day mood baseline is {avg_30d:.1f}/5.")
        if streak:
            drivers.append(f"Low-mood streak is {streak} day{'s' if streak != 1 else ''}.")

        recommended_action = (
            "Reduce friction and protect recovery while mood is under pressure."
            if streak >= 2 or (avg_mood is not None and avg_mood < 3.4)
            else "Keep the routines that are helping mood stay steady."
        )
        confidence = cls._confidence([avg_mood, avg_30d, streak if streak else None])
        return {
            "score": score,
            "confidence": confidence,
            "drivers": drivers[:4],
            "recommended_action": recommended_action,
            "details": {
                "avg_mood_14d": avg_mood,
                "avg_mood_30d": avg_30d,
                "low_mood_streak": streak,
            },
        }

    @classmethod
    def _build_habits_pillar(cls, *, goals, start, end, reference_date, include_live):
        habits = list(Habit.objects.exclude(health_domain=Habit.HealthDomain.GENERAL))
        if not habits:
            return {
                "score": 55.0,
                "confidence": 20.0,
                "drivers": ["No health-tagged habits are configured yet."],
                "recommended_action": "Tag the habits that genuinely support your health direction.",
                "details": {
                    "health_habit_count": 0,
                    "completion_rate_pct": None,
                    "helping_items": [],
                    "hurting_items": [],
                },
            }

        rates = []
        helping = []
        hurting = []
        days = max((end - start).days + 1, 1)
        for habit in habits:
            expected = cls._expected_occurrences(habit, days)
            completed = HabitLog.objects.filter(
                habit=habit,
                done=True,
                date__range=(start, end),
            ).count()
            rate = round((min(completed, expected) / expected) * 100, 1) if expected else 0.0
            rates.append(rate)
            label = f"{habit.name} ({rate:.0f}%)"
            if rate >= 75:
                helping.append(label)
            elif rate < 50:
                hurting.append(label)

        avg_rate = round(sum(rates) / max(len(rates), 1), 1)
        drivers = [
            f"Health-tagged habits are completing at {avg_rate:.1f}% in this window.",
        ]
        if helping:
            drivers.append(f"Helping most: {', '.join(helping[:3])}.")
        if hurting:
            drivers.append(f"Slipping most: {', '.join(hurting[:3])}.")
        recommended_action = (
            "Repair the habit routines that keep slipping."
            if hurting
            else "Keep compounding the habits that are supporting consistency."
        )
        return {
            "score": avg_rate,
            "confidence": cls._confidence([avg_rate, len(habits)]),
            "drivers": drivers[:4],
            "recommended_action": recommended_action,
            "details": {
                "health_habit_count": len(habits),
                "completion_rate_pct": avg_rate,
                "helping_items": helping[:5],
                "hurting_items": hurting[:5],
            },
        }

    @classmethod
    def _build_spiritual_pillar(cls, *, goals, start, end, reference_date, include_live):
        logs = list(SpiritualLog.objects.filter(date__range=(start, end)))
        prayers_done = sum(log.prayers_count for log in logs)
        prayer_pct = cls._percentage(prayers_done, len(logs) * 5) if logs else None
        consistency_pct = cls._percentage(
            sum(1 for log in logs if log.prayers_count > 0 or log.quran_pages > 0 or log.dhikr_done),
            len(logs),
        ) if logs else None
        quran_avg = round(sum(log.quran_pages for log in logs) / len(logs), 1) if logs else None
        gap_streak = cls._prayer_gap_streak(reference_date)
        score = round(
            ((prayer_pct if prayer_pct is not None else 55) * 0.6)
            + ((consistency_pct if consistency_pct is not None else 55) * 0.25)
            + ((min((quran_avg or 0) * 10, 100) if quran_avg is not None else 55) * 0.15)
            - min(gap_streak * 5, 20),
            1,
        )
        score = max(0, score)
        drivers = []
        if prayer_pct is not None:
            drivers.append(f"Prayer completion is {prayer_pct:.1f}% in the current window.")
        if consistency_pct is not None:
            drivers.append(f"Spiritual consistency is {consistency_pct:.1f}% across tracked days.")
        if gap_streak:
            drivers.append(f"Prayer gap streak is {gap_streak} day{'s' if gap_streak != 1 else ''}.")

        recommended_action = (
            "Re-anchor spiritual consistency with the smallest repeatable daily step."
            if gap_streak >= 2 or (prayer_pct is not None and prayer_pct < 65)
            else "Keep using spiritual consistency as one of your stabilizers."
        )
        confidence = cls._confidence([prayer_pct, consistency_pct, quran_avg, gap_streak if gap_streak else None])
        return {
            "score": score,
            "confidence": confidence,
            "drivers": drivers[:4],
            "recommended_action": recommended_action,
            "details": {
                "prayer_completion_pct": prayer_pct,
                "spiritual_consistency_pct": consistency_pct,
                "avg_quran_pages": quran_avg,
                "prayer_gap_streak": gap_streak,
            },
        }

    @classmethod
    def _top_strengths_and_watchouts(cls, pillars):
        sorted_pillars = sorted(pillars, key=lambda item: item["score"], reverse=True)
        strengths = [
            f"{item['label']} is a relative strength right now ({item['score']:.0f}/100)."
            for item in sorted_pillars[:2]
            if item["score"] >= 65
        ]
        watchouts = [
            f"{item['label']} needs attention ({item['score']:.0f}/100)."
            for item in sorted_pillars[::-1][:2]
            if item["score"] < 68
        ]
        return strengths, watchouts

    @classmethod
    def _cross_domain_insights(cls, pillars):
        by_id = {pillar["id"]: pillar for pillar in pillars}
        insights = []
        recovery = by_id.get("recovery", {})
        mood = by_id.get("mood", {})
        nutrition = by_id.get("nutrition", {})
        performance = by_id.get("performance_body", {})
        habits = by_id.get("habits", {})
        spiritual = by_id.get("spiritual", {})

        rec_details = recovery.get("details", {})
        mood_details = mood.get("details", {})
        nut_details = nutrition.get("details", {})

        avg_sleep = rec_details.get("avg_sleep_hours")
        if avg_sleep is not None and avg_sleep < 6.5 and (mood_details.get("avg_mood_14d") or 0) < 3.3:
            insights.append("Low sleep is likely dragging both mood steadiness and day-to-day capacity.")
        protein = nut_details.get("avg_daily_protein_g")
        if protein is not None and protein >= nut_details.get("target_protein_g", 10) * 0.9 and performance.get("score", 0) >= 65:
            insights.append("Protein consistency is supporting body performance and recovery momentum.")
        if habits.get("score", 0) >= 70 and spiritual.get("score", 0) >= 70:
            insights.append("Consistency habits and spiritual anchors are reinforcing each other well.")
        if not insights:
            insights.append("Health direction is currently being driven more by the individual pillars than by one dominant crossover effect.")
        return insights[:3]

    @classmethod
    def _headline(cls, *, overall_score, trend, strengths, watchouts):
        if trend == "improving":
            return f"Your health direction is improving at {overall_score:.0f}/100."
        if trend == "declining":
            return f"Your health direction is slipping to {overall_score:.0f}/100 and needs a reset."
        if strengths:
            return f"Your health direction is steady at {overall_score:.0f}/100, led by {strengths[0].split(' is ')[0].lower()}."
        if watchouts:
            return f"Your health direction is steady at {overall_score:.0f}/100, but {watchouts[0].split(' needs')[0].lower()} needs attention."
        return f"Your health direction is steady at {overall_score:.0f}/100."

    @staticmethod
    def _avg_decimal(queryset, field):
        value = queryset.aggregate(result=Avg(field))["result"]
        return round(float(value), 2) if value is not None else None

    @staticmethod
    def _scale_score(value, maximum):
        if value is None or maximum <= 0:
            return 55.0
        return round(max(0, min((float(value) / float(maximum)) * 100, 100)), 1)

    @staticmethod
    def _ratio_score(value, target):
        if value is None or not target:
            return 55.0
        ratio = float(value) / float(target)
        return round(max(0, min(ratio * 100, 100)), 1)

    @staticmethod
    def _percentage(numerator, denominator):
        if not denominator:
            return None
        return round((numerator / denominator) * 100, 1)

    @staticmethod
    def _volume_trend_score(current, previous):
        if current <= 0 and previous <= 0:
            return 55.0
        if previous <= 0:
            return 82.0 if current > 0 else 55.0
        delta = (current - previous) / previous
        return round(max(25, min(60 + (delta * 80), 100)), 1)

    @staticmethod
    def _body_goal_score(*, body_goal, fat_trend, muscle_trend):
        if body_goal == HealthGoalProfile.BodyGoal.LOSE_FAT:
            mapping = {
                "improving": 85.0,
                "stable": 65.0,
                "worsening": 35.0,
                "insufficient_data": 55.0,
            }
            return mapping.get(fat_trend, 55.0)
        if body_goal == HealthGoalProfile.BodyGoal.GAIN_MUSCLE:
            mapping = {
                "improving": 85.0,
                "stable": 65.0,
                "worsening": 35.0,
                "insufficient_data": 55.0,
            }
            return mapping.get(muscle_trend, 55.0)
        stableish = 0
        for trend in (fat_trend, muscle_trend):
            if trend == "stable":
                stableish += 1
            elif trend == "improving":
                stableish += 1
        return 75.0 if stableish >= 1 else 55.0

    @staticmethod
    def _status_from_score(score):
        if score >= 75:
            return "strong"
        if score >= 60:
            return "steady"
        return "attention"

    @staticmethod
    def _trend_from_delta(delta):
        if delta >= 5:
            return "improving"
        if delta <= -5:
            return "declining"
        return "stable"

    @staticmethod
    def _confidence(values):
        available = sum(1 for value in values if value is not None)
        total = max(len(values), 1)
        return round((available / total) * 100, 1)

    @staticmethod
    def _low_mood_streak(reference_date):
        streak = 0
        current = reference_date
        logs = {item.date: item for item in MoodLog.objects.filter(date__lte=reference_date)}
        while current in logs and logs[current].mood_score <= 2:
            streak += 1
            current -= datetime.timedelta(days=1)
        return streak

    @staticmethod
    def _prayer_gap_streak(reference_date):
        streak = 0
        current = reference_date
        logs = {item.date: item for item in SpiritualLog.objects.filter(date__lte=reference_date)}
        while current in logs and logs[current].prayers_count < 5:
            streak += 1
            current -= datetime.timedelta(days=1)
        return streak

    @staticmethod
    def _expected_occurrences(habit, days):
        if habit.target == Habit.Target.DAILY:
            return days
        if habit.target == Habit.Target.THREE_X_WEEK:
            return max(1, round((days / 7) * 3))
        if habit.target == Habit.Target.WEEKLY:
            return max(1, round(days / 7))
        return max(1, round((days / 7) * (habit.custom_days or 1)))


def end_equals(end_date, reference_date):
    return end_date == reference_date
