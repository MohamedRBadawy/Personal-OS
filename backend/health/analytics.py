"""Exercise and health analytics — strength history, body composition trends, readiness score."""
import datetime
from collections import defaultdict

from django.db.models import Avg, Max, Sum
from django.utils import timezone

# ── Static exercise → muscle group map ───────────────────────────────────────
# Key: substring of lowercased exercise name → (primary_muscle, [secondary_muscles])
# Lookup: iterate keys in order, first match wins.
EXERCISE_MUSCLE_MAP = [
    # Chest
    ('bench press',      ('chest',      ['triceps', 'shoulders'])),
    ('chest press',      ('chest',      ['triceps'])),
    ('chest fly',        ('chest',      [])),
    ('cable fly',        ('chest',      [])),
    ('pec deck',         ('chest',      [])),
    ('push up',          ('chest',      ['triceps', 'shoulders'])),
    ('push-up',          ('chest',      ['triceps', 'shoulders'])),
    # Back
    ('lat pulldown',     ('back',       ['biceps'])),
    ('pull up',          ('back',       ['biceps'])),
    ('pull-up',          ('back',       ['biceps'])),
    ('chin up',          ('back',       ['biceps'])),
    ('chin-up',          ('back',       ['biceps'])),
    ('cable row',        ('back',       ['biceps'])),
    ('seated row',       ('back',       ['biceps'])),
    ('bent over row',    ('back',       ['biceps'])),
    ('face pull',        ('back',       ['shoulders'])),
    ('deadlift',         ('back',       ['glutes', 'hamstrings'])),
    ('back extension',   ('back',       ['glutes'])),
    # Shoulders
    ('overhead press',   ('shoulders',  ['triceps'])),
    ('shoulder press',   ('shoulders',  ['triceps'])),
    ('military press',   ('shoulders',  ['triceps'])),
    ('lateral raise',    ('shoulders',  [])),
    ('front raise',      ('shoulders',  [])),
    ('shrug',            ('shoulders',  [])),
    ('upright row',      ('shoulders',  ['biceps'])),
    # Arms — biceps
    ('bicep curl',       ('biceps',     [])),
    ('biceps curl',      ('biceps',     [])),
    ('hammer curl',      ('biceps',     [])),
    ('preacher curl',    ('biceps',     [])),
    ('concentration curl', ('biceps',   [])),
    ('ez bar curl',      ('biceps',     [])),
    ('curl',             ('biceps',     [])),
    # Arms — triceps
    ('skull crusher',    ('triceps',    [])),
    ('tricep pushdown',  ('triceps',    [])),
    ('triceps pushdown', ('triceps',    [])),
    ('overhead tricep',  ('triceps',    [])),
    ('dip',              ('triceps',    ['chest'])),
    ('tricep',           ('triceps',    [])),
    # Core
    ('plank',            ('core',       [])),
    ('crunch',           ('core',       [])),
    ('sit up',           ('core',       [])),
    ('sit-up',           ('core',       [])),
    ('leg raise',        ('core',       [])),
    ('hanging leg',      ('core',       [])),
    ('ab wheel',         ('core',       [])),
    ('russian twist',    ('core',       [])),
    # Glutes / posterior chain
    ('hip thrust',       ('glutes',     ['hamstrings'])),
    ('glute bridge',     ('glutes',     [])),
    ('rdl',              ('hamstrings', ['glutes'])),
    ('romanian deadlift', ('hamstrings', ['glutes'])),
    ('good morning',     ('hamstrings', ['glutes'])),
    # Legs
    ('squat',            ('quads',      ['glutes', 'hamstrings'])),
    ('leg press',        ('quads',      ['glutes'])),
    ('lunge',            ('quads',      ['glutes'])),
    ('step up',          ('quads',      ['glutes'])),
    ('leg extension',    ('quads',      [])),
    ('leg curl',         ('hamstrings', [])),
    ('nordic curl',      ('hamstrings', [])),
    ('calf raise',       ('calves',     [])),
    ('calf',             ('calves',     [])),
]

ALL_MUSCLE_GROUPS = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps',
    'core', 'glutes', 'quads', 'hamstrings', 'calves',
]


class ExerciseAnalyticsService:
    """Computes derived exercise metrics, recovery score, and readiness."""

    # ── Epley 1RM ─────────────────────────────────────────────────────────────

    @staticmethod
    def estimated_1rm(weight_kg: float, reps: int) -> float:
        """Epley formula: weight × (1 + reps/30). Returns 0 if reps == 0."""
        if not weight_kg or not reps:
            return 0.0
        return round(float(weight_kg) * (1 + reps / 30), 1)

    # ── Muscle inference ──────────────────────────────────────────────────────

    @staticmethod
    def infer_muscles(exercise_name: str) -> tuple[str, list[str]]:
        """
        Returns (primary_muscle, secondary_muscles) for a given exercise name.
        Uses EXERCISE_MUSCLE_MAP keyword matching (case-insensitive, first match wins).
        Returns ('', []) if no match found.
        """
        lower = (exercise_name or '').lower()
        for keyword, (primary, secondary) in EXERCISE_MUSCLE_MAP:
            if keyword in lower:
                return primary, secondary
        return '', []

    # ── Muscle activation summary ─────────────────────────────────────────────

    @classmethod
    def muscle_activation_summary(cls, reference_date=None, days: int = 14) -> list[dict]:
        """
        Returns one entry per muscle group showing training recency and volume.

        Status:
        - 'fresh'     — trained within last 3 days
        - 'recovering' — 4-7 days ago
        - 'ready'     — 8-14 days ago
        - 'untrained' — never or >14 days ago
        """
        from health.models.workout import SetLog, WorkoutExercise

        today = reference_date or timezone.localdate()
        cutoff_14d = today - datetime.timedelta(days=14)
        cutoff_7d  = today - datetime.timedelta(days=7)
        cutoff_3d  = today - datetime.timedelta(days=3)

        # Fetch exercises with primary_muscle set, within 14-day window
        exercises_14d = (
            WorkoutExercise.objects
            .filter(
                session__date__gte=cutoff_14d,
                session__date__lte=today,
                primary_muscle__gt='',
            )
            .select_related('session')
        )

        # Build: muscle → {last_date, sets_7d, sets_14d}
        muscle_data: dict[str, dict] = {
            m: {'last_date': None, 'sets_7d': 0, 'sets_14d': 0}
            for m in ALL_MUSCLE_GROUPS
        }

        # For each exercise, count sets and track last trained date
        exercise_ids_by_muscle: dict[str, list] = defaultdict(list)
        exercise_last_date: dict[str, datetime.date] = {}

        for ex in exercises_14d:
            m = ex.primary_muscle
            if m not in muscle_data:
                continue
            ex_date = ex.session.date
            exercise_ids_by_muscle[m].append(ex.id)
            if exercise_last_date.get(m) is None or ex_date > exercise_last_date[m]:
                exercise_last_date[m] = ex_date

        # Count sets per muscle group
        for m, ex_ids in exercise_ids_by_muscle.items():
            sets_14d = SetLog.objects.filter(exercise_id__in=ex_ids).count()
            sets_7d = SetLog.objects.filter(
                exercise_id__in=ex_ids,
                exercise__session__date__gte=cutoff_7d,
            ).count()
            muscle_data[m]['sets_14d'] = sets_14d
            muscle_data[m]['sets_7d'] = sets_7d
            muscle_data[m]['last_date'] = exercise_last_date.get(m)

        result = []
        for m in ALL_MUSCLE_GROUPS:
            d = muscle_data[m]
            last_date = d['last_date']
            days_since = (today - last_date).days if last_date else None

            if days_since is None:
                status = 'untrained'
            elif days_since <= 3:
                status = 'fresh'
            elif days_since <= 7:
                status = 'recovering'
            elif days_since <= 14:
                status = 'ready'
            else:
                status = 'untrained'

            result.append({
                'muscle':       m,
                'last_trained': last_date.isoformat() if last_date else None,
                'days_since':   days_since,
                'sets_7d':      d['sets_7d'],
                'sets_14d':     d['sets_14d'],
                'status':       status,
            })

        return result

    # ── Strength history ──────────────────────────────────────────────────────

    @classmethod
    def strength_history(cls, exercise_name: str, weeks: int = 8) -> dict:
        """
        Returns weekly volume + estimated 1RM over time + all-time best set
        for the named exercise.

        Response shape:
        {
            exercise_name, weekly_volume: [{week, total_kg}],
            estimated_1rm_over_time: [{date, e1rm}],
            all_time_best: {date, weight_kg, reps, e1rm} | None,
        }
        """
        from health.models.workout import SetLog

        cutoff = timezone.localdate() - datetime.timedelta(weeks=weeks)
        sets = (
            SetLog.objects
            .filter(
                exercise__name__iexact=exercise_name,
                exercise__session__date__gte=cutoff,
                weight_kg__isnull=False,
                reps__isnull=False,
            )
            .select_related('exercise__session')
            .order_by('exercise__session__date')
        )

        weekly_volume: dict[str, float] = defaultdict(float)
        e1rm_over_time: list[dict] = []
        all_time_best = None
        all_time_best_e1rm = 0.0

        for s in sets:
            date = s.exercise.session.date
            week_label = date.strftime('%Y-W%W')
            volume = float(s.weight_kg) * (s.reps or 0)
            weekly_volume[week_label] += volume

            e1rm = cls.estimated_1rm(float(s.weight_kg), s.reps)
            e1rm_over_time.append({'date': date.isoformat(), 'e1rm': e1rm})

            if e1rm > all_time_best_e1rm:
                all_time_best_e1rm = e1rm
                all_time_best = {
                    'date': date.isoformat(),
                    'weight_kg': float(s.weight_kg),
                    'reps': s.reps,
                    'e1rm': e1rm,
                }

        return {
            'exercise_name': exercise_name,
            'weekly_volume': [
                {'week': w, 'total_kg': round(v, 1)}
                for w, v in sorted(weekly_volume.items())
            ],
            'estimated_1rm_over_time': e1rm_over_time,
            'all_time_best': all_time_best,
        }

    # ── Body composition trend ────────────────────────────────────────────────

    @classmethod
    def body_composition_trend(cls, days: int = 90) -> dict:
        """
        Returns snapshots + trend direction for fat % and muscle mass.

        fat_trend / muscle_trend: 'improving' | 'worsening' | 'stable' | 'insufficient_data'
        """
        from health.models.body_composition import BodyCompositionLog
        from health.serializers.body_composition import BodyCompositionLogSerializer

        cutoff = timezone.localdate() - datetime.timedelta(days=days)
        logs = list(
            BodyCompositionLog.objects
            .filter(date__gte=cutoff)
            .order_by('date')
        )

        snapshots = BodyCompositionLogSerializer(logs, many=True).data

        def _trend(logs_ordered, attr):
            values = [
                float(getattr(l, attr))
                for l in logs_ordered
                if getattr(l, attr) is not None
            ]
            if len(values) < 2:
                return 'insufficient_data'
            delta = values[-1] - values[0]
            if abs(delta) < 0.5:
                return 'stable'
            # Fat: lower is better. Muscle: higher is better.
            return 'improving' if delta < 0 else 'worsening'

        def _muscle_trend(logs_ordered):
            values = [
                float(l.muscle_mass_kg)
                for l in logs_ordered
                if l.muscle_mass_kg is not None
            ]
            if len(values) < 2:
                return 'insufficient_data'
            delta = values[-1] - values[0]
            if abs(delta) < 0.3:
                return 'stable'
            return 'improving' if delta > 0 else 'worsening'

        latest = snapshots[-1] if snapshots else None

        return {
            'snapshots': list(snapshots),
            'latest': latest,
            'fat_trend': _trend(logs, 'body_fat_pct'),
            'muscle_trend': _muscle_trend(logs),
        }

    # ── Recovery score ────────────────────────────────────────────────────────

    @classmethod
    def recovery_score(cls, reference_date=None) -> dict:
        """
        Composite 0-100 recovery score from 4 signals:
        - HRV (35%): latest vs 30-day baseline
        - Sleep quality (30%): last night's quality (1-5 → 0-100)
        - Resting HR (20%): lower is better vs baseline
        - Mood (15%): yesterday's mood (1-5 → 0-100)

        Missing signals fall back to neutral 60/100 with available=False.
        """
        from health.models.health_log import HealthLog
        from health.models.mood_log import MoodLog
        from health.models.wearable import WearableLog

        today = reference_date or timezone.localdate()
        yesterday = today - datetime.timedelta(days=1)
        thirty_days_ago = today - datetime.timedelta(days=30)

        components = {}

        # ── HRV ──────────────────────────────────────────────────────────────
        latest_wearable = WearableLog.objects.filter(date__lte=today).order_by('-date').first()
        hrv_baseline = WearableLog.objects.filter(
            date__gte=thirty_days_ago, date__lt=today, hrv_ms__isnull=False
        ).aggregate(avg=Avg('hrv_ms'))['avg']

        if latest_wearable and latest_wearable.hrv_ms and hrv_baseline:
            ratio = float(latest_wearable.hrv_ms) / float(hrv_baseline)
            # ratio > 1 means HRV is above baseline → good recovery
            hrv_score = min(100, max(0, int(60 + (ratio - 1) * 100)))
            components['hrv'] = {'score': hrv_score, 'available': True}
        else:
            components['hrv'] = {'score': 60, 'available': False}

        # ── Sleep quality ─────────────────────────────────────────────────────
        last_health_log = HealthLog.objects.filter(date=yesterday).first()
        if last_health_log:
            # sleep_quality is 1-5; map to 0-100
            sleep_score = int((last_health_log.sleep_quality - 1) / 4 * 100)
            components['sleep'] = {'score': sleep_score, 'available': True}
        else:
            components['sleep'] = {'score': 60, 'available': False}

        # ── Resting HR ───────────────────────────────────────────────────────
        rhr_baseline = WearableLog.objects.filter(
            date__gte=thirty_days_ago, date__lt=today, resting_heart_rate__isnull=False
        ).aggregate(avg=Avg('resting_heart_rate'))['avg']

        if latest_wearable and latest_wearable.resting_heart_rate and rhr_baseline:
            ratio = float(rhr_baseline) / float(latest_wearable.resting_heart_rate)
            rhr_score = min(100, max(0, int(60 + (ratio - 1) * 100)))
            components['resting_hr'] = {'score': rhr_score, 'available': True}
        else:
            components['resting_hr'] = {'score': 60, 'available': False}

        # ── Mood ─────────────────────────────────────────────────────────────
        yesterday_mood = MoodLog.objects.filter(date=yesterday).first()
        if yesterday_mood:
            mood_score = int((yesterday_mood.mood_score - 1) / 4 * 100)
            components['mood'] = {'score': mood_score, 'available': True}
        else:
            components['mood'] = {'score': 60, 'available': False}

        # ── Composite score ───────────────────────────────────────────────────
        weights = {'hrv': 0.35, 'sleep': 0.30, 'resting_hr': 0.20, 'mood': 0.15}
        composite = sum(weights[k] * components[k]['score'] for k in weights)
        score = int(composite)

        if score >= 80:
            label, intensity = 'High', 'full'
            recommendation = 'Excellent recovery. Good day for high-intensity work.'
        elif score >= 60:
            label, intensity = 'Good', 'moderate'
            recommendation = 'Ready for a solid training session.'
        elif score >= 40:
            label, intensity = 'Moderate', 'light'
            recommendation = 'Consider lighter intensity or active recovery today.'
        else:
            label, intensity = 'Poor', 'rest'
            recommendation = 'Prioritize rest and recovery. Skip intense training today.'

        return {
            'score': score,
            'label': label,
            'components': components,
            'recommendation': recommendation,
            'suggested_intensity': intensity,
        }

    # ── Readiness today ───────────────────────────────────────────────────────

    @classmethod
    def readiness_today(cls, reference_date=None) -> dict:
        """Recovery score + workout load context + suggested intensity."""
        from health.models.workout import WorkoutSession, SetLog

        today = reference_date or timezone.localdate()
        seven_days_ago = today - datetime.timedelta(days=7)

        recovery = cls.recovery_score(today)

        # Workout load last 7 days (total volume in kg)
        recent_sessions = WorkoutSession.objects.filter(
            date__gte=seven_days_ago, date__lte=today
        )
        session_ids = list(recent_sessions.values_list('id', flat=True))
        total_volume = (
            SetLog.objects
            .filter(exercise__session_id__in=session_ids, weight_kg__isnull=False, reps__isnull=False)
            .aggregate(total=Sum('weight_kg'))['total'] or 0
        )

        # Consecutive rest days (days without a workout)
        rest_days_streak = 0
        check_date = today - datetime.timedelta(days=1)
        while not WorkoutSession.objects.filter(date=check_date).exists():
            rest_days_streak += 1
            check_date -= datetime.timedelta(days=1)
            if rest_days_streak >= 14:  # cap to avoid infinite loop with no data
                break

        recovery['workout_load_7d_kg'] = float(total_volume)
        recovery['rest_days_streak'] = rest_days_streak
        recovery['session_count_7d'] = recent_sessions.count()
        return recovery

    # ── AI context builder ────────────────────────────────────────────────────

    @classmethod
    def build_ai_context(cls, reference_date=None) -> dict:
        """Assemble the full context dict for analyze_health_week."""
        from health.models.workout import WorkoutSession, SetLog
        from health.models.mood_log import MoodLog
        from health.serializers.workout import WorkoutSessionSerializer

        today = reference_date or timezone.localdate()
        seven_days_ago = today - datetime.timedelta(days=7)
        thirty_days_ago = today - datetime.timedelta(days=30)

        # Last 7 workout sessions with enriched exercise data
        sessions = list(
            WorkoutSession.objects
            .filter(date__gte=seven_days_ago)
            .prefetch_related('exercises__sets')
            .order_by('date')
        )

        workouts_7d = []
        strength_prs = []
        for session in sessions:
            exercises_data = []
            for ex in session.exercises.all():
                sets = list(ex.sets.all())
                if not sets:
                    continue
                total_volume = sum(
                    float(s.weight_kg or 0) * (s.reps or 0) for s in sets
                )
                best_e1rm = 0.0
                top_set = None
                for s in sets:
                    if s.weight_kg and s.reps:
                        e1rm = cls.estimated_1rm(float(s.weight_kg), s.reps)
                        if e1rm > best_e1rm:
                            best_e1rm = e1rm
                            top_set = {
                                'weight_kg': float(s.weight_kg),
                                'reps': s.reps,
                                'e1rm': e1rm,
                            }
                exercises_data.append({
                    'name': ex.name,
                    'category': ex.category,
                    'total_volume_kg': round(total_volume, 1),
                    'top_set': top_set,
                })
                if top_set:
                    strength_prs.append({
                        'exercise': ex.name,
                        'date': session.date.isoformat(),
                        **top_set,
                    })

            workouts_7d.append({
                'date': session.date.isoformat(),
                'session_type': session.session_type,
                'duration_mins': session.duration_mins,
                'exercises': exercises_data,
            })

        # Body composition latest
        body_comp = cls.body_composition_trend(days=90)

        # Wearable recovery signals
        from health.models.wearable import WearableLog
        from django.db.models import Avg
        wearable_30d = WearableLog.objects.filter(
            date__gte=thirty_days_ago, date__lte=today
        )
        wearable_7d = WearableLog.objects.filter(
            date__gte=seven_days_ago, date__lte=today
        )
        from health.models.health_log import HealthLog
        sleep_quality_7d = HealthLog.objects.filter(
            date__gte=seven_days_ago
        ).aggregate(avg=Avg('sleep_quality'))['avg']

        recovery = {
            'avg_hrv_7d': wearable_7d.filter(hrv_ms__isnull=False).aggregate(avg=Avg('hrv_ms'))['avg'],
            'avg_hrv_30d': wearable_30d.filter(hrv_ms__isnull=False).aggregate(avg=Avg('hrv_ms'))['avg'],
            'avg_resting_hr_7d': wearable_7d.filter(resting_heart_rate__isnull=False).aggregate(avg=Avg('resting_heart_rate'))['avg'],
            'avg_sleep_quality_7d': round(float(sleep_quality_7d), 2) if sleep_quality_7d else None,
        }
        # HRV trend: 7d avg vs 30d avg
        if recovery['avg_hrv_7d'] and recovery['avg_hrv_30d']:
            if float(recovery['avg_hrv_7d']) < float(recovery['avg_hrv_30d']) * 0.9:
                recovery['hrv_trend'] = 'declining'
            elif float(recovery['avg_hrv_7d']) > float(recovery['avg_hrv_30d']) * 1.1:
                recovery['hrv_trend'] = 'improving'
            else:
                recovery['hrv_trend'] = 'stable'
        else:
            recovery['hrv_trend'] = 'unknown'

        # Mood × workout correlation (last 14 days)
        fourteen_days_ago = today - datetime.timedelta(days=14)
        mood_logs = {
            ml.date: ml.mood_score
            for ml in MoodLog.objects.filter(date__gte=fourteen_days_ago)
        }
        session_dates = set(
            WorkoutSession.objects.filter(date__gte=fourteen_days_ago).values_list('date', flat=True)
        )
        mood_workout = []
        for i in range(14):
            d = fourteen_days_ago + datetime.timedelta(days=i)
            if d in mood_logs:
                mood_workout.append({
                    'date': d.isoformat(),
                    'had_workout': d in session_dates,
                    'mood_score': mood_logs[d],
                })

        return {
            'period_start': seven_days_ago.isoformat(),
            'period_end': today.isoformat(),
            'workouts_7d': workouts_7d,
            'strength_prs': strength_prs,
            'body_composition_latest': body_comp['latest'],
            'body_composition_fat_trend': body_comp['fat_trend'],
            'body_composition_muscle_trend': body_comp['muscle_trend'],
            'recovery': recovery,
            'mood_x_workout': mood_workout,
            'readiness': cls.readiness_today(today),
        }
